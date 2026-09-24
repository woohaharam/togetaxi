-- 로그인 안 한 사용자는 어떤 함수도 직접 부를 수 없고,
-- 트리거·내부용 함수는 API로 노출하지 않는다.
revoke execute on all functions in schema public from public, anon;

revoke execute on function
  public.check_university_email(),
  public.fill_university_domain(),
  public.my_profile(),
  public.system_message(uuid, text)
from authenticated;

grant execute on function
  public.is_ride_member(uuid),
  public.popular_places(bigint),
  public.create_ride(text, text, timestamptz, int, boolean, int, text),
  public.join_ride(uuid),
  public.leave_ride(uuid),
  public.kick_member(uuid, uuid),
  public.set_ride_status(uuid, public.ride_status),
  public.set_final_fare(uuid, int)
to authenticated;
