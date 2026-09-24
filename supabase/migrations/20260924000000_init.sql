-- 학교 · 장소
create table public.universities (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 2 and 40),
  campus text not null default '' check (char_length(campus) <= 20),
  region text not null check (region in (
    '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기',
    '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'
  )),
  kind text check (kind in ('4년제', '전문대', '대학원')),
  domains text[] not null default '{}', -- 학교 메일 도메인 (가입 시 학교 추천용)
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (name, campus)
);

create index on public.universities using gin (domains);

-- 학교마다 미리 넣어 둔 장소. 나머지는 popular_places()가 실제 공고에서 뽑아 준다.
create table public.places (
  id bigint generated always as identity primary key,
  university_id bigint not null references public.universities (id) on delete cascade,
  name text not null,
  sort int not null default 0
);
create index on public.places (university_id, sort);

-- 프로필
create type public.gender as enum ('male', 'female');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null unique check (char_length(nickname) between 2 and 12),
  gender public.gender not null,
  university_id bigint not null references public.universities (id),
  pay_link text check (char_length(pay_link) <= 200), -- 송금 링크나 계좌
  created_at timestamptz not null default now()
);

-- 공고
create type public.ride_status as enum ('open', 'closed', 'cancelled');

create table public.rides (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  university_id bigint not null references public.universities (id),
  origin text not null check (char_length(origin) between 1 and 40),
  destination text not null check (char_length(destination) between 1 and 40),
  depart_at timestamptz not null,
  capacity int not null check (capacity between 2 and 4), -- 방장 포함 총 인원
  member_count int not null default 1,
  same_gender_only boolean not null default false,
  host_gender public.gender not null,
  estimated_fare int check (estimated_fare between 0 and 1000000),
  final_fare int check (final_fare between 0 and 1000000),
  note text check (char_length(note) <= 200),
  status public.ride_status not null default 'open',
  created_at timestamptz not null default now()
);
create index on public.rides (depart_at);
create index on public.rides (university_id, depart_at);

create table public.ride_members (
  ride_id uuid not null references public.rides (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (ride_id, user_id)
);
create index on public.ride_members (user_id);

-- 채팅
create table public.messages (
  id bigint generated always as identity primary key,
  ride_id uuid not null references public.rides (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null, -- null이면 시스템 메시지
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);
create index on public.messages (ride_id, id);

-- 대학 메일(.ac.kr, .edu)로만 가입
create or replace function public.check_university_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null or new.email !~* '\.(ac\.kr|edu)$' then
    raise exception '학교 메일(.ac.kr, .edu)로만 가입할 수 있어요';
  end if;
  return new;
end;
$$;

create trigger check_university_email
  before insert or update of email on auth.users
  for each row execute function public.check_university_email();

-- 헬퍼
create or replace function public.is_ride_member(p_ride uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.ride_members
    where ride_id = p_ride and user_id = auth.uid()
  );
$$;

create or replace function public.system_message(p_ride uuid, p_content text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.messages (ride_id, user_id, content) values (p_ride, null, p_content);
$$;
revoke execute on function public.system_message(uuid, text) from public, anon, authenticated;

create or replace function public.my_profile()
returns public.profiles
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.profiles;
begin
  select * into v from public.profiles where id = auth.uid();
  if not found then
    raise exception '프로필부터 만들어 주세요';
  end if;
  return v;
end;
$$;

-- RPC: 공고
create or replace function public.create_ride(
  p_origin text,
  p_destination text,
  p_depart_at timestamptz,
  p_capacity int,
  p_same_gender_only boolean,
  p_estimated_fare int,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.profiles := public.my_profile();
  v_id uuid;
begin
  if p_depart_at < now() - interval '10 minutes' then
    raise exception '출발 시간이 지났어요';
  end if;
  if p_depart_at > now() + interval '30 days' then
    raise exception '30일 이내 일정만 올릴 수 있어요';
  end if;
  if (
    select count(*) from public.rides
    where host_id = me.id and status <> 'cancelled' and depart_at > now()
  ) >= 3 then
    raise exception '모집은 한 번에 3개까지 열 수 있어요';
  end if;

  insert into public.rides (
    host_id, university_id, origin, destination, depart_at, capacity,
    same_gender_only, host_gender, estimated_fare, note
  ) values (
    me.id, me.university_id, trim(p_origin), trim(p_destination), p_depart_at, p_capacity,
    coalesce(p_same_gender_only, false), me.gender, p_estimated_fare, nullif(trim(p_note), '')
  )
  returning id into v_id;

  insert into public.ride_members (ride_id, user_id) values (v_id, me.id);
  perform public.system_message(v_id, me.nickname || '님이 모집을 열었어요');
  return v_id;
end;
$$;

create or replace function public.join_ride(p_ride uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.profiles := public.my_profile();
  r public.rides;
begin
  select * into r from public.rides where id = p_ride for update;
  if not found then
    raise exception '없는 모집이에요';
  end if;
  if exists (select 1 from public.ride_members where ride_id = p_ride and user_id = me.id) then
    return;
  end if;
  if r.status <> 'open' then
    raise exception '모집이 끝났어요';
  end if;
  if r.depart_at < now() then
    raise exception '이미 출발했어요';
  end if;
  if r.member_count >= r.capacity then
    raise exception '자리가 다 찼어요';
  end if;
  if r.same_gender_only and r.host_gender <> me.gender then
    raise exception '동성끼리만 타는 모집이에요';
  end if;

  insert into public.ride_members (ride_id, user_id) values (p_ride, me.id);
  update public.rides set member_count = member_count + 1 where id = p_ride;
  perform public.system_message(p_ride, me.nickname || '님이 들어왔어요');
end;
$$;

create or replace function public.leave_ride(p_ride uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.profiles := public.my_profile();
  r public.rides;
begin
  select * into r from public.rides where id = p_ride for update;
  if not found then
    raise exception '없는 모집이에요';
  end if;
  if r.host_id = me.id then
    raise exception '방장은 나갈 수 없어요. 모집을 취소해 주세요';
  end if;

  delete from public.ride_members where ride_id = p_ride and user_id = me.id;
  if found then
    update public.rides set member_count = member_count - 1 where id = p_ride;
    perform public.system_message(p_ride, me.nickname || '님이 나갔어요');
  end if;
end;
$$;

create or replace function public.kick_member(p_ride uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.profiles := public.my_profile();
  r public.rides;
  v_name text;
begin
  select * into r from public.rides where id = p_ride for update;
  if not found or r.host_id <> me.id then
    raise exception '방장만 할 수 있어요';
  end if;
  if p_user = me.id then
    raise exception '자기 자신은 내보낼 수 없어요';
  end if;

  delete from public.ride_members where ride_id = p_ride and user_id = p_user;
  if found then
    select nickname into v_name from public.profiles where id = p_user;
    update public.rides set member_count = member_count - 1 where id = p_ride;
    perform public.system_message(p_ride, coalesce(v_name, '알 수 없음') || '님을 방장이 내보냈어요');
  end if;
end;
$$;

create or replace function public.set_ride_status(p_ride uuid, p_status public.ride_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.profiles := public.my_profile();
  r public.rides;
begin
  select * into r from public.rides where id = p_ride for update;
  if not found or r.host_id <> me.id then
    raise exception '방장만 할 수 있어요';
  end if;
  if r.status = 'cancelled' then
    raise exception '취소된 모집이에요';
  end if;
  if r.status = p_status then
    return;
  end if;

  update public.rides set status = p_status where id = p_ride;
  perform public.system_message(p_ride, case p_status
    when 'open' then '모집을 다시 열었어요'
    when 'closed' then '모집을 마감했어요'
    when 'cancelled' then '방장이 모집을 취소했어요'
  end);
end;
$$;

create or replace function public.set_final_fare(p_ride uuid, p_fare int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.profiles := public.my_profile();
  r public.rides;
  v_each int;
begin
  select * into r from public.rides where id = p_ride for update;
  if not found or r.host_id <> me.id then
    raise exception '방장만 할 수 있어요';
  end if;
  if p_fare is null or p_fare <= 0 then
    raise exception '금액을 입력해 주세요';
  end if;

  update public.rides set final_fare = p_fare where id = p_ride;
  -- 100원 단위 올림
  v_each := ceil(p_fare::numeric / r.member_count / 100) * 100;
  perform public.system_message(p_ride,
    '택시비 ' || to_char(p_fare, 'FM999,999,999') || '원, ' || r.member_count || '명이서 1인당 '
    || to_char(v_each, 'FM999,999,999') || '원이에요');
end;
$$;

-- 사용자가 학교를 직접 추가하면 그 사람 메일 도메인을 붙여 둔다
create or replace function public.fill_university_domain()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_domain text := lower(split_part(auth.jwt() ->> 'email', '@', 2));
begin
  if new.created_by is not null and v_domain <> '' then
    new.domains := array[v_domain];
    new.kind := null;
  end if;
  return new;
end;
$$;

create trigger fill_university_domain
  before insert on public.universities
  for each row execute function public.fill_university_domain();

-- 우리 학교 공고에 자주 나온 출발지·도착지
create or replace function public.popular_places(p_university bigint)
returns setof text
language sql
stable
set search_path = ''
as $$
  select place from (
    select origin as place from public.rides
    where university_id = p_university and created_at > now() - interval '90 days'
    union all
    select destination from public.rides
    where university_id = p_university and created_at > now() - interval '90 days'
  ) t
  group by place
  having count(*) >= 2
  order by count(*) desc, place
  limit 10;
$$;

-- RLS
alter table public.universities enable row level security;
alter table public.places enable row level security;
alter table public.profiles enable row level security;
alter table public.rides enable row level security;
alter table public.ride_members enable row level security;
alter table public.messages enable row level security;

create policy "누구나 학교 목록 조회" on public.universities
  for select using (true);
create policy "로그인 사용자 학교 추가" on public.universities
  for insert to authenticated with check (created_by = auth.uid());

create policy "누구나 장소 조회" on public.places
  for select using (true);

create policy "로그인 사용자 프로필 조회" on public.profiles
  for select to authenticated using (true);
create policy "본인 프로필 생성" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "본인 프로필 수정" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- 성별 · 학교는 가입 후 바꿀 수 없음 (동성 탑승 옵션 악용 방지)
revoke update on public.profiles from authenticated, anon;
grant update (nickname, pay_link) on public.profiles to authenticated;

create policy "로그인 사용자 공고 조회" on public.rides
  for select to authenticated using (true);

create policy "로그인 사용자 참여자 조회" on public.ride_members
  for select to authenticated using (true);

create policy "참여자만 채팅 조회" on public.messages
  for select to authenticated using (public.is_ride_member(ride_id));
create policy "참여자만 채팅 전송" on public.messages
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_ride_member(ride_id));

-- 공고 · 참여 변경은 RPC 함수로만
revoke insert, update, delete on public.rides, public.ride_members from authenticated, anon;
revoke update, delete on public.messages from authenticated, anon;

-- 실시간 채팅
alter publication supabase_realtime add table public.messages;
