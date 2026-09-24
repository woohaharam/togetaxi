import { requireProfile } from "@/lib/auth";
import NewRideForm from "./NewRideForm";

export default async function NewRidePage() {
  const { supabase, profile } = await requireProfile();
  const [{ data: seeded }, { data: popular }] = await Promise.all([
    supabase.from("places").select("name").eq("university_id", profile.university_id).order("sort"),
    supabase.rpc("popular_places", { p_university: profile.university_id }),
  ]);

  const places = [...new Set([...(seeded ?? []).map((p) => p.name), ...((popular as string[] | null) ?? [])])];
  return <NewRideForm places={places} gender={profile.gender} />;
}
