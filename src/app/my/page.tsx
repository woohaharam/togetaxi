import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import Avatar from "@/components/Avatar";
import RideCard from "@/components/RideCard";
import { requireProfile } from "@/lib/auth";
import { universityLabel } from "@/lib/format";
import { rideState } from "@/lib/rides";
import type { RideWithUniversity } from "@/lib/types";
import BlockList from "./BlockList";
import DeleteAccount from "./DeleteAccount";
import FeedbackForm from "./FeedbackForm";
import ProfileForm from "./ProfileForm";
import PushToggle from "@/components/pwa/PushToggle";

export default async function MyPage() {
  const { supabase, profile, user } = await requireProfile();

  const [{ data }, { data: isAdmin }] = await Promise.all([
    supabase
      .from("ride_members")
      .select("ride:rides(*, university:universities(id, name, campus, region))")
      .eq("user_id", profile.id)
      .returns<{ ride: RideWithUniversity | null }[]>(),
    supabase.rpc("is_admin"),
  ]);
  const { data: blockRows } = await supabase
    .from("blocks")
    .select("blocked_id, profile:profiles!blocks_blocked_id_fkey(nickname)")
    .eq("blocker_id", profile.id)
    .order("created_at", { ascending: false })
    .returns<{ blocked_id: string; profile: { nickname: string } | null }[]>();
  const blocks = (blockRows ?? []).map((b) => ({ id: b.blocked_id, nickname: b.profile?.nickname ?? "알 수 없음" }));

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

        {isAdmin === true && (
          <Link href="/admin" className="card mt-8 flex items-center justify-between text-[15px] font-medium">
            운영 통계
            <span className="text-zinc-400">›</span>
          </Link>
        )}

        <section className="card mt-8">
          <h2 className="mb-2 font-bold">알림</h2>
          <PushToggle />
        </section>

        <section className="card mt-2.5">
          <h2 className="mb-1 font-bold">의견 보내기</h2>
          <p className="mb-3 text-[13px] text-zinc-500">운영자가 직접 읽어요. 신고할 일이 있으면 채팅방이나 모집 화면의 신고를 써 주세요.</p>
          <FeedbackForm userId={profile.id} />
        </section>

        <section className="card mt-2.5">
          <h2 className="mb-2 font-bold">차단한 사람</h2>
          <BlockList userId={profile.id} blocks={blocks} />
        </section>

        <nav className="mt-8 flex justify-center gap-4 text-[13px] text-zinc-500">
          <Link href="/terms">이용약관</Link>
          <Link href="/privacy" className="font-semibold">
            개인정보처리방침
          </Link>
        </nav>

        <form action="/auth/signout" method="post" className="mt-6 text-center">
          <button className="text-sm text-zinc-500">로그아웃</button>
        </form>
        <div className="mt-4">
          <DeleteAccount />
        </div>
      </main>
      <BottomNav />
    </>
  );
}
