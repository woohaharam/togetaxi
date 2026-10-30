-- 금칙어 판정을 두 갈래로 나눈다.
--
-- 기존 방식은 띄어쓰기와 기호를 모두 지운 뒤 '시발'을 찾았는데, 그러면
-- "5시 발 기차"가 "5시발기차"가 되어 멀쩡한 문장이 막혔다. 채팅에서 막히는 쪽이
-- 욕설이 한 번 지나가는 것보다 나쁘므로, 오탐을 줄이는 쪽으로 바꾼다.
--
-- 이 필터는 충동적으로 쓰는 욕을 거르는 턱일 뿐 우회를 전부 막지는 못한다.
-- 작정한 사람은 신고(public.reports)로 걸러 운영자가 처리한다.
create or replace function public.has_banned_words(p text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_text text := lower(coalesce(p, ''));
  -- 자모·숫자·기호를 끼워 넣는 우회를 막으려고 글자만 남긴다. ("씨1발", "ㅅ.ㅂ")
  v_letters text := regexp_replace(v_text, '[^a-z가-힣ㄱ-ㅎㅏ-ㅣ]', '', 'g');
begin
  -- 평범한 문장에 섞일 일이 없는 말.
  if v_letters ~ '(씨발|씨바|씨빨|쓰발|ㅅㅂ|ㅆㅂ|병신|븅신|ㅄ|ㅂㅅ|개새끼|개새기|개색기|씹새|씹년|좆|지랄|느금|니애미|니에미|느그애미|니미럴|창녀|걸레년|fuck|shit|bitch)' then
    return true;
  end if;

  -- '시발'은 멀쩡한 말에도 들어간다. 그래서 원문 그대로 보고
  -- 앞에 숫자가 있거나("5시발 기차") 뒤에 한글이 붙으면("시발점", "시발역") 넘어간다.
  if v_text ~ '(^|[^0-9])시발($|[^가-힣])' then
    return true;
  end if;

  return false;
end;
$$;

revoke execute on function public.has_banned_words(text) from public, anon;
grant execute on function public.has_banned_words(text) to authenticated;
