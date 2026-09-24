import BottomNav from "@/components/BottomNav";
import Avatar from "@/components/Avatar";
import RideCard from "@/components/RideCard";
import { requireProfile } from "@/lib/auth";
import { universityLabel } from "@/lib/format";
import { rideState } from "@/lib/rides";
import type { RideWithUniversity } from "@/lib/types";
import ProfileForm from "./ProfileForm";

export default async function MyPage() {
  const { supabase, profile, user } = await requireProfile();

  const { data } = await supabase
    .from("ride_members")
    .select("ride:rides(*, university:universities(id, name, campus, region))")
    .eq("user_id", profile.id)
    .returns<{ ride: RideWithUniversity | null }[]>();

  const rides = (data ?? []).flatMap((d) => (d.ride ? [d.ride] : []));
  const upcoming = rides
    .filter((r) => ["open", "full", "closed"].includes(rideState(r)))
    .sort((a, b) => a.depart_at.localeCompare(b.depart_at));
  const past = rides
    .filter((r) => !upcoming.includes(r))
    .sort((a, b) => b.depart_at.localeCompare(a.depart_at))
    .slice(0, 20);

  return (
    <>
      <main className="px-4 pt-6 pb-28">
        <section className="card">
          <div className="flex items-center gap-3">
            <Avatar id={profile.id} name={profile.nickname} size={44} />
            <div className="min-w-0">
              <p className="text-[17px] font-bold">{profile.nickname}</p>
              <p className="truncate text-[13px] text-zinc-500">
                {universityLabel(profile.university)} · {user.email}
              </p>
            </div>
          </div>
          <ProfileForm userId={profile.id} nickname={profile.nickname} payLink={profile.pay_link ?? ""} />
        </section>

        <h2 className="mt-8 mb-2.5 px-1 font-bold">타기로 한 택시</h2>
        {upcoming.length === 0 ? (
          <p className="px-1 text-sm text-zinc-400">아직 없어요.</p>
        ) : (
          <div className="space-y-2.5">
            {upcoming.map((r) => (
              <RideCard key={r.id} ride={r} showUniversity={r.university_id !== profile.university_id} />
            ))}
          </div>
        )}

        {past.length > 0 && (
          <>
            <h2 className="mt-8 mb-2.5 px-1 font-bold">지난 택시</h2>
            <div className="space-y-2.5">
              {past.map((r) => (
                <RideCard key={r.id} ride={r} showUniversity={r.university_id !== profile.university_id} />
              ))}
            </div>
          </>
        )}

        <form action="/auth/signout" method="post" className="mt-10 text-center">
          <button className="text-sm text-zinc-400">로그아웃</button>
        </form>
      </main>
      <BottomNav />
    </>
  );
}
