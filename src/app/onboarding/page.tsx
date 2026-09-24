import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { University } from "@/lib/types";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (existing) redirect("/");

  const { data: universities } = await supabase
    .from("universities")
    .select("id, name, campus, region, kind, domains")
    .order("name")
    .order("campus")
    .returns<University[]>();

  return <OnboardingForm userId={user.id} email={user.email ?? ""} universities={universities ?? []} />;
}
