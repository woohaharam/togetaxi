import type { SupabaseClient } from "@supabase/supabase-js";
import type { Member, Profile, RideWithUniversity } from "@/lib/types";

export async function fetchRide(supabase: SupabaseClient, id: string) {
  const { data } = await supabase
    .from("rides")
    .select("*, university:universities(id, name, campus, region)")
    .eq("id", id)
    .maybeSingle<RideWithUniversity>();
  return data;
}

export async function fetchMembers(supabase: SupabaseClient, rideId: string) {
  const { data } = await supabase
    .from("ride_members")
    .select("user_id, joined_at, profile:profiles(id, nickname, gender, university_id)")
    .eq("ride_id", rideId)
    .order("joined_at")
    .returns<Member[]>();
  return data ?? [];
}

export async function fetchHost(supabase: SupabaseClient, hostId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("id, nickname, gender, university_id, pay_link")
    .eq("id", hostId)
    .maybeSingle<Profile>();
  return data;
}

/** 참여 불가 사유 (참여 가능하면 null) */
export function joinBlocker(ride: RideWithUniversity, me: Pick<Profile, "gender">) {
  if (ride.status === "cancelled") return "취소된 공고예요";
  if (ride.status === "closed") return "모집이 마감됐어요";
  if (new Date(ride.depart_at) < new Date()) return "출발 시간이 지났어요";
  if (ride.member_count >= ride.capacity) return "자리가 모두 찼어요";
  if (ride.same_gender_only && ride.host_gender !== me.gender) {
    return `${ride.host_gender === "female" ? "여성" : "남성"}만 참여할 수 있어요`;
  }
  return null;
}
