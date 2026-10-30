import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, University } from "@/lib/types";

/** 로그인 + 프로필이 있는 사용자만 통과. 없으면 로그인/온보딩으로 보냄 */
export async function requireProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, university:universities(*)")
    .eq("id", user.id)
    .maybeSingle<Profile & { university: University }>();
  if (!profile) redirect("/onboarding");

  return { supabase, user, profile };
}
