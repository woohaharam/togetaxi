import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { formatDepart, perPerson, universityLabel, won } from "@/lib/format";
import { fetchMembers, fetchRide, joinBlocker } from "@/lib/rides";
import JoinButton from "./JoinButton";

export default async function RidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();
  const ride = await fetchRide(supabase, id);
  if (!ride) notFound();
  const members = await fetchMembers(supabase, id);

  const isMember = members.some((m) => m.user_id === profile.id);
  const blocker = joinBlocker(ride, profile);
  const seatsLeft = ride.capacity - ride.member_count;

  return (
    <main className="px-4 pb-32">
      <header className="flex items-center gap-3 py-4">
        <Link href="/" className="text-2xl leading-none">
          ←
        </Link>
        <h1 className="text-lg font-bold">공고 상세</h1>
      </header>

      <section className="card space-y-4">
        <div>
          <p className="text-sm font-semibold text-zinc-500">{formatDepart(ride.depart_at)} 출발</p>
          <div className="mt-2 space-y-1 text-xl font-bold">
            <p>
              <span className="mr-2 text-sm text-zinc-400">출발</span>
              {ride.origin}
            </p>
            <p>
              <span className="mr-2 text-sm text-zinc-400">도착</span>
              {ride.destination}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3 border-t border-zinc-100 pt-4 text-sm">
          <div>
            <dt className="text-zinc-400">인원</dt>
            <dd className="font-semibold">
              {ride.member_count}/{ride.capacity}명{" "}
              {ride.status === "open" && seatsLeft > 0 && (
                <span className="text-amber-600">({seatsLeft}자리 남음)</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-400">조건</dt>
            <dd className="font-semibold">
              {ride.same_gender_only
                ? `${ride.host_gender === "female" ? "여성" : "남성"}만`
                : "누구나"}
            </dd>
          </div>
          {ride.estimated_fare ? (
            <div>
              <dt className="text-zinc-400">예상 택시비</dt>
              <dd className="font-semibold">
                {won(ride.estimated_fare)}
                <span className="block text-xs font-normal text-zinc-500">
                  꽉 차면 1인 {won(perPerson(ride.estimated_fare, ride.capacity))}
                </span>
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-zinc-400">학교</dt>
            <dd className="font-semibold">{universityLabel(ride.university)}</dd>
          </div>
        </dl>

        {ride.note && (
          <p className="rounded-xl bg-zinc-50 p-3 text-sm whitespace-pre-wrap text-zinc-700">
            {ride.note}
          </p>
        )}
      </section>

      <section className="card mt-3">
        <h2 className="mb-3 text-sm font-semibold text-zinc-500">함께 타는 사람</h2>
        <ul className="space-y-2">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-full bg-zinc-100">
                {m.profile?.gender === "female" ? "👩" : "👨"}
              </span>
              <span className="font-medium">{m.profile?.nickname ?? "알 수 없음"}</span>
              {m.user_id === ride.host_id && (
                <span className="rounded bg-taxi px-1.5 py-0.5 text-xs font-semibold">방장</span>
              )}
              {m.user_id === profile.id && <span className="text-xs text-zinc-400">(나)</span>}
            </li>
          ))}
        </ul>
      </section>

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md bg-gradient-to-t from-zinc-50 via-zinc-50 px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {isMember ? (
          <Link href={`/rides/${ride.id}/chat`} className="btn-primary w-full">
            💬 채팅방 들어가기
          </Link>
        ) : (
          <JoinButton rideId={ride.id} blocker={blocker} />
        )}
      </div>
    </main>
  );
}
