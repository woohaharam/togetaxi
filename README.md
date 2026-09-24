# 같이타

같은 방향 가는 대학생끼리 택시를 같이 타고 요금을 나눠 내는 웹앱.

- 학교 메일(.ac.kr, .edu) 인증으로만 가입
- 전국 408개 대학·전문대 등록 (커리어넷 학교 목록 기준), 없으면 직접 추가
- 메일 도메인으로 학교 자동 추천
- 모집 글 → "같이 타기" → 바로 그룹 채팅
- 동성끼리만 타기, 정원, 모집 마감·취소, 내보내기
- 실제 요금 입력하면 1인 금액 공지, 방장 송금 링크·계좌 표시
- 학교마다 자주 가는 장소를 실제 모집 기록에서 뽑아 추천

## 구조

Next.js 15 (App Router) + Supabase (Postgres, Auth, Realtime).

```
src/app/            화면 (login, onboarding, 홈, rides/new, rides/[id], rides/[id]/chat, my)
src/lib/            Supabase 클라이언트, 포맷 함수, 모집 상태 계산
supabase/migrations 스키마, RLS, RPC 함수, 학교·장소 시드
scripts/            학교 목록 시드 생성기
```

모집 생성·참여·나가기·정산 같은 쓰기 작업은 전부 Postgres 함수 안에서 처리한다.
정원, 성별 조건, 방장 권한 검사가 DB에 있기 때문에 API를 직접 호출해도 우회할 수 없다.
채팅은 참여자만 읽고 쓸 수 있다 (RLS).

## 로컬 실행

Node 20+, Docker 필요.

```bash
npm install
npx supabase start
npx supabase status -o env     # API_URL, ANON_KEY 확인
cp .env.example .env.local     # 값 채우기
npm run dev
```

로컬 인증 메일은 http://127.0.0.1:54324 에서 확인.

## 학교 목록 갱신

```bash
npm update korea-universities
node scripts/build-universities.mjs > supabase/migrations/<새 타임스탬프>_seed_universities.sql
```

시드는 `on conflict do update`라 여러 번 적용해도 된다.
같은 학교가 여러 지역에 있으면 스크립트 안의 `CAMPUS` 표에서 캠퍼스 이름을 붙인다.

## 운영 설정 (Supabase 대시보드)

1. **Authentication → Emails → SMTP Settings**: 커스텀 SMTP 연결.
   기본 메일 서버는 프로젝트 팀원 주소로만 발송돼서 학생들이 가입할 수 없다.
   Gmail 앱 비밀번호(smtp.gmail.com:465)나 Resend 등을 쓰면 된다.
2. **Authentication → URL Configuration**: Site URL을 배포 주소로,
   Redirect URLs에 `https://<배포 주소>/auth/callback` 추가.
3. **Authentication → Emails → Templates**: "Magic Link"와 "Confirm signup" 본문에
   `{{ .Token }}`을 넣어 인증번호가 보이게 한다 (`supabase/templates/otp.html` 참고).
   안 바꿔도 메일의 링크로 로그인은 된다.
