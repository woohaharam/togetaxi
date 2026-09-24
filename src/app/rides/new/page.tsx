import { requireProfile } from "@/lib/auth";
import NewRideForm from "./NewRideForm";

export default async function NewRidePage() {
  const { supabase, profile } = await requireProfile();
  const { data: places } = await supabase
    .from("places")
    .select("name")
    .eq("university_id", profile.university_id)
    .order("sort");

  return <NewRideForm places={(places ?? []).map((p) => p.name)} gender={profile.gender} />;
}
