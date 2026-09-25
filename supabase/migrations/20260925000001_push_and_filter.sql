-- 푸시 알림 · 금칙어

create extension if not exists pg_net with schema extensions;

-- API로 노출되지 않는 설정 저장소 (push_url, push_secret)
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.config (
  key text primary key,
  value text not null
);

create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
create policy "내 구독 조회" on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());

-- 한 기기에서 계정을 바꿔 로그인해도 마지막 사용자에게 가도록 endpoint 기준으로 덮어쓴다
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, created_at = now();
$$;

create or replace function public.delete_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;

-- 알림 서버가 만료된 구독을 지울 때 쓴다
create or replace function public.prune_push_subscriptions(p_secret text, p_endpoints text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_secret is distinct from (select value from private.config where key = 'push_secret') then
    raise exception 'forbidden';
  end if;
  delete from public.push_subscriptions where endpoint = any (p_endpoints);
end;
$$;

-- 누가 일으킨 메시지인지 (본인에게는 알림을 보내지 않으려고)
-- security definer 함수 안에서도 auth.uid()는 요청한 사용자를 가리킨다
alter table public.messages add column actor_id uuid default auth.uid();

create or replace function private.notify_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
  r public.rides;
  v_subs jsonb;
  v_body text;
begin
  select value into v_url from private.config where key = 'push_url';
  select value into v_secret from private.config where key = 'push_secret';
  if v_url is null or v_secret is null then
    return new;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth)), '[]')
  into v_subs
  from public.ride_members m
  join public.push_subscriptions s on s.user_id = m.user_id
  where m.ride_id = new.ride_id and m.user_id is distinct from new.actor_id;

  if jsonb_array_length(v_subs) = 0 then
    return new;
  end if;

  select * into r from public.rides where id = new.ride_id;
  if new.user_id is null then
    v_body := new.content;
  else
    select coalesce(p.nickname, '') || ': ' || left(new.content, 120) into v_body
    from public.profiles p where p.id = new.user_id;
  end if;

  perform net.http_post(
    url := v_url,
    body := jsonb_build_object(
      'title', r.origin || ' → ' || r.destination,
      'body', v_body,
      'url', '/rides/' || r.id || '/chat',
      'tag', 'ride-' || r.id,
      'subscriptions', v_subs
    ),
    headers := jsonb_build_object('content-type', 'application/json', 'x-push-secret', v_secret)
  );
  return new;
exception when others then
  -- 알림이 실패해도 채팅은 계속 되어야 한다
  raise warning 'notify_push: %', sqlerrm;
  return new;
end;
$$;

create trigger notify_push
  after insert on public.messages
  for each row execute function private.notify_push();

-- 금칙어: 띄어쓰기·특수문자를 끼워 넣어 피하는 것도 잡는다
create or replace function public.has_banned_words(p text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(lower(coalesce(p, '')), '[^0-9a-z가-힣ㄱ-ㅎㅏ-ㅣ]', '', 'g')
    ~ '(씨발|씨바|씨빨|쓰발|시발(?!점)|ㅅㅂ|ㅆㅂ|병신|븅신|ㅄ|ㅂㅅ|개새끼|개새기|개색기|씹새|씹년|좆|지랄|느금|니애미|니에미|느그애미|니미럴|창녀|걸레년|fuck|shit|bitch)';
$$;

create or replace function public.reject_banned_words()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_text text;
begin
  -- 테이블마다 컬럼이 달라서 따로 꺼낸다 (NEW의 없는 컬럼을 참조하면 오류가 난다)
  if tg_table_name = 'messages' then
    if new.user_id is null then
      return new;
    end if;
    v_text := new.content;
  elsif tg_table_name = 'profiles' then
    v_text := new.nickname;
  elsif tg_table_name = 'rides' then
    v_text := new.origin || ' ' || new.destination || ' ' || coalesce(new.note, '');
  end if;

  if public.has_banned_words(v_text) then
    raise exception '부적절한 표현이 들어 있어요';
  end if;
  return new;
end;
$$;

create trigger reject_banned_words before insert on public.messages
  for each row execute function public.reject_banned_words();
create trigger reject_banned_words before insert or update of nickname on public.profiles
  for each row execute function public.reject_banned_words();
create trigger reject_banned_words before insert or update of origin, destination, note on public.rides
  for each row execute function public.reject_banned_words();

revoke execute on function
  public.save_push_subscription(text, text, text),
  public.delete_push_subscription(text),
  public.prune_push_subscriptions(text, text[]),
  public.reject_banned_words()
from public, anon, authenticated;
-- 트리거가 사용자 권한으로 호출하므로 로그인 사용자는 실행할 수 있어야 한다
revoke execute on function public.has_banned_words(text) from public, anon;
grant execute on function public.has_banned_words(text) to authenticated;

grant execute on function
  public.save_push_subscription(text, text, text),
  public.delete_push_subscription(text)
to authenticated;
grant execute on function public.prune_push_subscriptions(text, text[]) to anon, authenticated;
