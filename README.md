# 같이타

같은 방향으로 가는 대학생끼리 택시를 함께 타고 요금을 나누는 웹앱.

**https://togetaxi.vercel.app**

지방 캠퍼스에서 기차역·터미널까지 택시비가 1만 5천 원쯤 나온다. 넷이 타면 4천 원이다.
그래서 학생들은 에브리타임에 "같이 타실 분" 글을 올리는데, 글은 금방 묻히고 쪽지를 주고받다
보면 출발 시간이 지나 있다. 이 과정을 줄이려고 만들었다.

모집 글을 올리면 같은 방향 가는 사람이 **같이 타기** 한 번으로 참여하고, 바로 그룹 채팅이 열린다.
도착해서 방장이 실제 요금을 입력하면 1인당 금액이 채팅방에 공지된다.

## 설계에서 신경 쓴 것

### 규칙은 전부 데이터베이스에 둔다

정원 초과, 동성 제한, 방장 권한, 차단 관계 같은 판단을 화면에서만 막으면 API를 직접 부르는
사람에게는 소용이 없다. 그래서 쓰기 동작은 모두 Postgres 함수로만 하고, 테이블 직접 수정 권한은
회수했다.

```sql
revoke insert, update, delete on public.rides, public.ride_members from authenticated, anon;
```

참여는 `join_ride()` 하나를 거치는데, 이 안에서 `select ... for update`로 모집 행을 잠그고
정원을 확인한다. 두 사람이 마지막 한 자리를 동시에 누르면 한 명만 들어간다.

채팅은 RLS로 막는다. 같은 모집에 속한 사람만 읽고 쓸 수 있고, `user_id`가 비어 있는
시스템 안내 메시지는 아무도 만들 수 없다.

```sql
create policy "참여자만 채팅 전송" on public.messages
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_ride_member(ride_id));
```

이 규칙들은 `tests/db/policies.test.ts`에서 화면을 거치지 않고 직접 확인한다.

### 성별은 가입 뒤에 못 바꾼다

'여자끼리만 타기' 옵션은 성별을 믿을 수 있어야 의미가 있다. 프로필 수정 권한을 컬럼 단위로
좁혀서, 닉네임과 정산 정보만 바꿀 수 있게 했다.

```sql
revoke update on public.profiles from authenticated;
grant update (nickname, pay_link) on public.profiles to authenticated;
```

### 날짜는 Intl을 쓰지 않는다

서버는 UTC에서, 브라우저는 한국 시간에서 돌기 때문에 `toLocaleString`의 결과가 서로 달라
하이드레이션이 깨졌다. 지금은 UTC 기준으로 9시간을 더한 뒤 직접 포맷해서 양쪽이 같은 문자열을
만든다.

### 욕설 필터는 오탐을 더 싫어한다

처음에는 띄어쓰기와 기호를 모두 지운 뒤 금칙어를 찾았는데, "5시 발 기차"가 "5시발기차"가 되어
막혔다. 채팅에서 멀쩡한 말이 막히는 쪽이 욕이 한 번 지나가는 것보다 나쁘다고 보고, 평범한
문장에 섞이지 않는 말과 그렇지 않은 말을 나눠서 판정한다. 작정한 우회는 막지 못하므로
신고 기능이 실제 대응 수단이다.

### 탈퇴해도 남는 것

탈퇴하면 방장이던 모집은 취소되고 참여 중이던 모집에서는 빠진다. 다만 지난 채팅은 다른
사람의 대화 기록이기도 해서 내용은 남기고 작성자 연결만 끊는다. 신고 기록도 같은 이유로
남긴다. 피해자가 떠났다고 신고가 사라지면 안 되기 때문이다.

## 기능

| | |
|---|---|
| 가입 | 학교 메일(.ac.kr, .edu) 인증번호 → 비밀번호 설정. 이후에는 메일 없이 로그인 |
| 학교 | 커리어넷 기준 408개 대학·전문대. 메일 도메인으로 자동 추천, 없으면 직접 추가 |
| 모집 | 출발·도착·시간·인원·동성 제한·예상 요금. 한 번에 3개까지 |
| 목록 | 우리 학교 / 우리 지역 / 전국, 목적지 검색 |
| 채팅 | Supabase Realtime 그룹 채팅, 웹 푸시 알림 |
| 정산 | 실제 요금 입력 → 1인당 금액 공지, 방장 송금 링크 표시 |
| 안전 | 신고, 차단, 금칙어, 탈퇴, 운영자 처리함 |

## 구조

```
src/app/            화면 (App Router)
src/components/     공용 UI
src/lib/            Supabase 클라이언트, 포맷·상태 계산
supabase/migrations 스키마, RLS, RPC 함수, 학교 시드
scripts/            학교 목록 시드 생성기
tests/              단위 테스트
tests/db/           RLS·RPC 규칙 테스트
```

Next.js 15(App Router) + TypeScript + Tailwind CSS v4, Supabase(Postgres·Auth·Realtime).
서버 컴포넌트에서 데이터를 읽고, 실시간이 필요한 채팅만 클라이언트에서 구독한다.

## 개발

Node 22+, Docker 필요.

```bash
npm install
npx supabase start          # 로컬 Postgres + Auth (마이그레이션 자동 적용)
npx supabase status -o env  # API_URL, ANON_KEY 확인
cp .env.example .env.local  # 위 값으로 채우기
npm run dev
```

로컬에서는 메일이 실제로 가지 않는다. 인증번호는 http://127.0.0.1:54324 에서 확인한다.

```bash
npm run check     # 린트 + 타입 + 단위 테스트
npm run test:db   # RLS·RPC 테스트 (로컬 Supabase 필요)
```

## 배포

`main`에 올라가면 Vercel이 자동 배포한다. 함수는 서울 리전(icn1)에서 돌아 DB와 같은 지역이다.

필요한 환경 변수는 `.env.example`에 정리해 뒀다. 운영 쪽에서 추가로 해야 하는 설정:

- **Supabase → Authentication → SMTP**: 기본 메일 서버는 프로젝트 팀원에게만 보내진다.
  실제 운영에는 별도 SMTP를 연결해야 한다.
- **Authentication → URL Configuration**: Site URL과 `/auth/callback` 리다이렉트 주소
- **Authentication → Email Templates**: 본문에 `{{ .Token }}`을 넣어야 인증번호가 보인다
- **푸시 알림**: `private.config`에 `push_url`, `push_secret`을 넣는다 (아래 참고)

### 학교 목록 갱신

```bash
npm update korea-universities
node scripts/build-universities.mjs > supabase/migrations/<타임스탬프>_seed_universities.sql
```

`on conflict do update`라 여러 번 적용해도 된다. 같은 학교가 여러 지역에 있으면
스크립트의 `CAMPUS` 표에서 실제로 부르는 캠퍼스 이름을 붙인다.

### 푸시 알림 흐름

`messages` 테이블 트리거가 `pg_net`으로 `/api/push`를 부르고, 그 라우트가 `web-push`로
각 기기에 보낸다. 보낸 사람 본인에게는 가지 않고, 해당 채팅방을 보고 있는 기기에서는
서비스 워커가 알림을 띄우지 않는다. 만료된 구독은 응답 코드를 보고 지운다.

아이폰은 iOS 16.4 이상에서 홈 화면에 추가한 뒤에만 웹 푸시를 받을 수 있다.

### 운영자

`/admin`에서 가입자·모집·매칭률·신고·의견을 본다. 운영자는 SQL로만 추가한다.

```sql
insert into public.admins (user_id)
select id from auth.users where email = '<학교 메일>';
```

## 다음에 할 것

- 가입 중 이탈이 많다. 메일 인증을 끝낸 28명 중 12명이 프로필 입력에서 나갔다.
- 모집 글이 없으면 들어와도 할 게 없다. 시험 종료일·연휴 같은 수요가 몰리는 시점에 맞춰
  목록을 미리 채워야 한다.
- 명절 귀향 버스처럼 한 번에 여러 명을 모으는 쪽이 택시 합승보다 수요가 클 수 있다.
