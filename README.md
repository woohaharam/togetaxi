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

## 운영 통계

`/admin` 에서 가입자·모집·매칭률·아낀 택시비 등을 본다. 내 정보 화면 아래에 링크가 뜬다.
운영자는 SQL로만 추가한다.

```sql
insert into public.admins (user_id)
select id from auth.users where email = '<학교 메일>';
```

## 광고

카카오 애드핏에서 320x100 광고 단위를 만들고, Vercel 환경 변수 `NEXT_PUBLIC_ADFIT_UNIT`에
광고 단위 ID(DAN-…)를 넣은 뒤 다시 배포하면 목록의 세 번째 글 뒤에 광고 한 칸이 붙는다.
모집 글이 4개 미만이거나 채울 광고가 없으면 칸 자체가 나오지 않는다.
변수를 지우고 다시 배포하면 꺼진다.

## 알림 (웹 푸시)

새 메시지나 참여가 생기면 DB 트리거(`private.notify_push`)가 `pg_net`으로 `/api/push`를 부르고,
그 라우트가 `web-push`로 각 기기에 보낸다. 보낸 사람 본인에게는 가지 않고, 그 채팅방을 보고 있는
기기에는 서비스 워커가 알림을 띄우지 않는다. 만료된 구독은 자동으로 지운다.

필요한 설정:

- Vercel 환경 변수: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `PUSH_SECRET`
  (키는 `npx web-push generate-vapid-keys`로 만든다)
- DB: `private.config`에 `push_url`(배포 주소 + `/api/push`)과 `push_secret`(위와 같은 값)

```sql
insert into private.config values
  ('push_url', 'https://<배포 주소>/api/push'),
  ('push_secret', '<PUSH_SECRET 과 같은 값>')
on conflict (key) do update set value = excluded.value;
```

아이폰은 iOS 16.4 이상에서 홈 화면에 추가한 뒤에만 알림을 받을 수 있다.

## 금칙어

`public.has_banned_words()`에 목록이 있고, 채팅·모집 글·닉네임을 저장할 때 DB 트리거가 막는다.
띄어쓰기나 특수문자를 끼워 넣어도 걸리며, '시발점'처럼 정상 단어는 예외로 둔다.
