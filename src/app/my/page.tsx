import BottomNav from "@/components/BottomNav";
import RideCard from "@/components/RideCard";
import { requireProfile } from "@/lib/auth";
import { universityLabel } from "@/lib/format";
import type { RideWithUniversity } from "@/lib/types";
import ProfileForm from "./ProfileForm";

export default async function MyPage() {
  const { supabase, profile, user } = await requireProfile();

  const { data } = await supabase
    .from("ride_members")
    .select("ride:rides(*, university:universities(id, name, campus, region))")
    .eq("user_id", profile.id)
    .returns<{ ride: RideWithUniversity | null }[]>();

  const rides = (data ?? [])
    .map((d) => d.ride)
    .filter((r): r is RideWithUniversity => !!r)
    .sort((a, b) => b.depart_at.localeCompare(a.depart_at));
  const cutoff = Date.now() - 60 * 60 * 1000;
  const upcoming = rides
    .filter((r) => r.status !== "cancelled" && new Date(r.depart_at).getTime() > cutoff)
    .reverse();
  const past = rides.filter((r) => !upcoming.includes(r)).slice(0, 20);

  return (
    <>
      <main className="space-y-6 px-4 pt-5 pb-28">
        <section className="card">
          <p className="text-xs text-zinc-500">{universityLabel(profile.university)}</p>
          <p className="text-xl font-bold">
            {profile.nickname} {profile.gender === "female" ? "👩" : "👨"}
          </p>
          <p className="text-xs text-zinc-400">{user.email}</p>
          <ProfileForm nickname={profile.nickname} payLink={profile.pay_link ?? ""} />
        </section>

        <section className="space-y-3">
          <h2 className="font-bold">예정된 택시</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-zinc-400">참여 중인 공고가 없어요</p>
          ) : (
            upcoming.map((r) => <RideCard key={r.id} ride={r} showUniversity />)
          )}
        </section>

        {past.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-bold">지난 택시</h2>
            {past.map((r) => (
              <RideCard key={r.id} ride={r} showUniversity />
            ))}
          </section>
        )}

        <form action="/auth/signout" method="post">
          <button className="w-full py-3 text-sm text-zinc-400 underline">로그아웃</button>
        </form>
      </main>
      <BottomNav />
    </>
  );
}
