-- 신고 · 차단 · 의견 · 탈퇴

create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid references public.profiles (id) on delete set null, -- 탈퇴해도 신고 내용은 남긴다
  target_user_id uuid references public.profiles (id) on delete set null,
  ride_id uuid references public.rides (id) on delete set null,
  reason text not null check (reason in ('no_show', 'abuse', 'fraud', 'spam', 'other')),
  detail text check (char_length(detail) <= 500),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  check (target_user_id is not null or ride_id is not null)
);
create index on public.reports (created_at desc) where resolved_at is null;

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index on public.blocks (blocked_id);

create table public.feedback (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles (id) on delete set null,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;
alter table public.blocks enable row level security;
alter table public.feedback enable row level security;

create policy "본인 이름으로 신고" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());

create policy "내 차단 목록 조회" on public.blocks
  for select to authenticated using (blocker_id = auth.uid());
create policy "차단하기" on public.blocks
  for insert to authenticated with check (blocker_id = auth.uid());
create policy "차단 해제" on public.blocks
  for delete to authenticated using (blocker_id = auth.uid());

create policy "의견 보내기" on public.feedback
  for insert to authenticated with check (user_id = auth.uid());

-- 탈퇴해도 지난 모집과 채팅 기록은 남도록 방장 연결만 끊는다
alter table public.rides alter column host_id drop not null;
alter table public.rides drop constraint rides_host_id_fkey;
alter table public.rides add constraint rides_host_id_fkey
  foreign key (host_id) references public.profiles (id) on delete set null;

-- 서로 차단한 사람이 있는 모집에는 들어갈 수 없다
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
  if exists (
    select 1 from public.ride_members m
    join public.blocks b
      on (b.blocker_id = me.id and b.blocked_id = m.user_id)
      or (b.blocked_id = me.id and b.blocker_id = m.user_id)
    where m.ride_id = p_ride
  ) then
    raise exception '참여할 수 없는 모집이에요';
  end if;

  insert into public.ride_members (ride_id, user_id) values (p_ride, me.id);
  update public.rides
    set member_count = member_count + 1,
        peak_members = greatest(peak_members, member_count + 1)
    where id = p_ride;
  perform public.system_message(p_ride, me.nickname || '님이 들어왔어요');
end;
$$;

-- 실제로 2명 이상 모여서 출발한 횟수
create or replace function public.ride_counts(p_users uuid[])
returns table (user_id uuid, rides int)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, count(*)::int
  from public.ride_members m
  join public.rides r on r.id = m.ride_id
  where m.user_id = any (p_users)
    and r.status <> 'cancelled'
    and r.depart_at < now()
    and r.peak_members >= 2
  group by m.user_id;
$$;

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.profiles := public.my_profile();
  r record;
begin
  for r in
    select id from public.rides
    where host_id = me.id and status <> 'cancelled' and depart_at > now()
  loop
    update public.rides set status = 'cancelled' where id = r.id;
    perform public.system_message(r.id, '방장이 탈퇴해서 모집이 취소됐어요');
  end loop;

  for r in
    select x.id from public.ride_members m
    join public.rides x on x.id = m.ride_id
    where m.user_id = me.id and x.host_id <> me.id
      and x.status <> 'cancelled' and x.depart_at > now()
  loop
    delete from public.ride_members where ride_id = r.id and user_id = me.id;
    update public.rides set member_count = member_count - 1 where id = r.id;
    perform public.system_message(r.id, me.nickname || '님이 나갔어요');
  end loop;

  delete from auth.users where id = me.id;
end;
$$;

-- 운영자: 신고 처리
create or replace function public.resolve_report(p_report bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception '권한이 없어요';
  end if;
  update public.reports set resolved_at = now() where id = p_report and resolved_at is null;
end;
$$;

-- 운영자: 처리 안 된 신고와 최근 의견
create or replace function public.admin_inbox()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception '권한이 없어요';
  end if;

  return jsonb_build_object(
    'reports', (
      select coalesce(jsonb_agg(t order by t.created_at desc), '[]') from (
        select rp.id, rp.reason, rp.detail, rp.created_at,
          coalesce(reporter.nickname, '탈퇴한 사용자') as reporter,
          target.nickname as target,
          case when ride.id is null then null else ride.origin || ' → ' || ride.destination end as ride
        from public.reports rp
        left join public.profiles reporter on reporter.id = rp.reporter_id
        left join public.profiles target on target.id = rp.target_user_id
        left join public.rides ride on ride.id = rp.ride_id
        where rp.resolved_at is null
        order by rp.created_at desc
        limit 50
      ) t
    ),
    'feedback', (
      select coalesce(jsonb_agg(t order by t.created_at desc), '[]') from (
        select f.id, f.content, f.created_at, p.nickname as author
        from public.feedback f
        left join public.profiles p on p.id = f.user_id
        order by f.created_at desc
        limit 30
      ) t
    )
  );
end;
$$;

revoke execute on function
  public.ride_counts(uuid[]),
  public.delete_account(),
  public.resolve_report(bigint),
  public.admin_inbox()
from public, anon;

grant execute on function
  public.ride_counts(uuid[]),
  public.delete_account(),
  public.resolve_report(bigint),
  public.admin_inbox()
to authenticated;
