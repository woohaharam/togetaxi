import type { SupabaseClient } from "@supabase/supabase-js";
import type { Member, Profile, Ride, RideWithUniversity } from "@/lib/types";

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

export type RideState = "open" | "full" | "closed" | "departed" | "cancelled";

export function rideState(ride: Ride): RideState {
  if (ride.status === "cancelled") return "cancelled";
  if (new Date(ride.depart_at) < new Date()) return "departed";
  if (ride.status === "closed") return "closed";
  if (ride.member_count >= ride.capacity) return "full";
  return "open";
}

/** 참여할 수 없으면 그 이유를, 가능하면 null */
export function joinBlocker(ride: Ride, me: Pick<Profile, "gender">) {
  const state = rideState(ride);
  if (state === "cancelled") return "취소된 모집이에요";
  if (state === "departed") return "이미 출발했어요";
  if (state === "closed") return "모집이 끝났어요";
  if (state === "full") return "자리가 다 찼어요";
  if (ride.same_gender_only && ride.host_gender !== me.gender) {
    return ride.host_gender === "female" ? "여자만 탈 수 있어요" : "남자만 탈 수 있어요";
  }
  return null;
}
