# 같이타 (togetaxi) 🚕

전국 대학생을 위한 **택시 같이 타기** 서비스예요.
공고를 올리면 같은 방향 가는 학우가 **"같이 타기"** 를 누르고, 바로 **채팅방**으로 연결돼요.
첫 기준 캠퍼스는 동국대 WISE캠퍼스이고, 전국 어느 학교에서든 쓸 수 있어요.

## 주요 기능

| 기능 | 설명 |
| --- | --- |
| 학교 이메일 인증 | `.ac.kr` / `.edu` 이메일로 받은 6자리 인증번호로 가입·로그인 (DB에서도 한 번 더 검사) |
| 학교 · 캠퍼스 선택 | 전국 주요 대학 기본 등록, 목록에 없으면 직접 추가 |
| 공고 올리기 | 출발/도착(학교별 자주 가는 장소 버튼), 출발 시간, 총 인원 2~4명, 동성만 옵션, 예상 요금 → 1인당 금액 자동 계산 |
| 공고 목록 | 우리 학교 / 우리 지역 / 전국 필터, 목적지 검색 |
| 같이 타기 → 채팅 | 누르면 바로 참여하고 실시간 그룹 채팅방으로 이동 (정원·성별 조건은 서버에서 검사) |
| 방장 기능 | 모집 마감/재개, 공고 취소, 참여자 내보내기, **요금 정산**(실제 요금 입력 → 1인당 금액 공지) |
| 정산 받을 곳 | 내 정보에 토스/카카오페이 송금 링크나 계좌를 등록해 두면 채팅방에 "송금하기/계좌 복사" 버튼이 떠요 |
| 내 택시 | 예정된 택시 / 지난 택시 모아보기 |
| PWA | 휴대폰 홈 화면에 앱처럼 추가 가능 |

## 기술 스택

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS v4
- **Supabase**: 이메일 OTP 인증, Postgres + RLS(행 수준 보안), Realtime 채팅

```
src/
  app/
    login/            이메일 인증번호 로그인
    onboarding/       닉네임 · 성별 · 학교 설정
    page.tsx          공고 목록 (홈)
    rides/new/        공고 올리기
    rides/[id]/       공고 상세 + 같이 타기
    rides/[id]/chat/  실시간 채팅 · 정산
    my/               내 정보 · 내 택시
  lib/                Supabase 클라이언트, 타입, 포맷 유틸
supabase/
  migrations/         DB 스키마 · RLS · RPC 함수 · 기본 학교 목록
  templates/otp.html  인증번호 메일 템플릿
```

공고 생성·참여·나가기·내보내기·정산은 모두 DB 함수(RPC)로만 처리해서
앱을 거치지 않고 API를 직접 호출해도 정원 초과, 성별 조건 우회, 남의 채팅 읽기 같은 걸 할 수 없어요.

## 로컬에서 실행하기

필요한 것: Node.js 20+, Docker

```bash
npm install
npx supabase start          # 로컬 Supabase 실행 (마이그레이션 자동 적용)
npx supabase status -o env  # API_URL, ANON_KEY 확인
cp .env.example .env.local  # 위 값으로 채우기
npm run dev                 # http://localhost:3000
```

로컬에서는 메일이 실제로 가지 않아요. 인증번호는 **http://127.0.0.1:54324** (Mailpit)에서 확인하세요.

## 배포하기 (Supabase + Vercel)

1. [supabase.com](https://supabase.com)에서 프로젝트 생성
2. 스키마 적용
   ```bash
   npx supabase link --project-ref <프로젝트 ref>
   npx supabase db push
   ```
3. Supabase 대시보드 설정
   - **Authentication → Email Templates**: "Magic Link"와 "Confirm signup" 템플릿에 `{{ .Token }}`을 넣어 인증번호가 보이게 하기 (`supabase/templates/otp.html` 참고)
   - **Authentication → SMTP**: 기본 메일 발송은 시간당 발송량이 매우 적어서, 실제 운영에는 Resend·SendGrid 같은 SMTP 연결을 권장해요
   - **Authentication → URL Configuration**: Site URL을 배포 주소로 변경
4. [Vercel](https://vercel.com)에 이 저장소를 연결하고 환경변수 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정 후 배포

## 다음에 해볼 것

- 신고 · 차단, 매너 평가
- 새 참여자 · 새 메시지 푸시 알림
- 자주 가는 장소를 학교마다 추가 (현재는 동국대 WISE만 등록됨 — `places` 테이블)
- 출발 시간 지난 공고 자동 마감
