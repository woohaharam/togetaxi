-- 운영자 통계

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
-- 정책 없음: API로는 읽거나 쓸 수 없고, 운영자 추가는 SQL로만 한다.

-- 한 번이라도 2명 이상 모였는지 알기 위해 최대 인원을 남긴다
alter table public.rides add column peak_members int not null default 1;
update public.rides set peak_members = greatest(member_count, 1);

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
  update public.rides
    set member_count = member_count + 1,
        peak_members = greatest(peak_members, member_count + 1)
    where id = p_ride;
  perform public.system_message(p_ride, me.nickname || '님이 들어왔어요');
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Asia/Seoul')::date;
  result jsonb;
begin
  if not public.is_admin() then
    raise exception '권한이 없어요';
  end if;

  with
  days as (
    select generate_series(today - 13, today, interval '1 day')::date as day
  ),
  signups as (
    select (created_at at time zone 'Asia/Seoul')::date as day, count(*) as n
    from public.profiles group by 1
  ),
  new_rides as (
    select (created_at at time zone 'Asia/Seoul')::date as day, count(*) as n
    from public.rides group by 1
  ),
  finished as (
    select * from public.rides where depart_at < now() and status <> 'cancelled'
  )
  select jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'users_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'schools', (select count(distinct university_id) from public.profiles),
    'rides', (select count(*) from public.rides),
    'rides_7d', (select count(*) from public.rides where created_at > now() - interval '7 days'),
    'open_now', (
      select count(*) from public.rides
      where status = 'open' and depart_at > now() and member_count < capacity
    ),
    'finished', (select count(*) from finished),
    'matched', (select count(*) from finished where peak_members >= 2),
    'messages', (select count(*) from public.messages where user_id is not null),
    'settled', (select count(*) from public.rides where final_fare is not null),
    -- 혼자 탔다면 각자 냈을 금액 - 실제 낸 금액
    'saved', (
      select coalesce(sum(final_fare * (member_count - 1)), 0)
      from public.rides where final_fare is not null
    ),
    'daily', (
      select jsonb_agg(jsonb_build_object(
        'day', d.day,
        'signups', coalesce(s.n, 0),
        'rides', coalesce(r.n, 0)
      ) order by d.day)
      from days d
      left join signups s using (day)
      left join new_rides r using (day)
    ),
    'top_schools', (
      select coalesce(jsonb_agg(t), '[]') from (
        select trim(u.name || ' ' || u.campus) as label, count(*) as n
        from public.profiles p join public.universities u on u.id = p.university_id
        group by u.id order by n desc, label limit 10
      ) t
    ),
    'top_routes', (
      select coalesce(jsonb_agg(t), '[]') from (
        select origin || ' → ' || destination as label, count(*) as n
        from public.rides where status <> 'cancelled'
        group by origin, destination order by n desc, label limit 10
      ) t
    )
  ) into result;

  return result;
end;
$$;

revoke execute on function public.is_admin(), public.admin_stats() from public, anon;
grant execute on function public.is_admin(), public.admin_stats() to authenticated;
