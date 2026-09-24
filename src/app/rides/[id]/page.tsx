import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import PageHeader from "@/components/PageHeader";
import Route from "@/components/Route";
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
  const seatsLeft = ride.capacity - ride.member_count;

  const facts: [string, string][] = [
    ["인원", `${ride.member_count}/${ride.capacity}명${ride.status === "open" && seatsLeft > 0 ? ` · ${seatsLeft}자리 남음` : ""}`],
    ["조건", ride.same_gender_only ? (ride.host_gender === "female" ? "여자만" : "남자만") : "누구나"],
  ];
  if (ride.estimated_fare) {
    facts.push(["예상 요금", `${won(ride.estimated_fare)} (1인 약 ${won(perPerson(ride.estimated_fare, ride.capacity))})`]);
  }
  facts.push(["학교", universityLabel(ride.university)]);

  return (
    <>
      <PageHeader title="모집 정보" />
      <main className="px-4 pb-32">
        <section className="card">
          <p className="text-[15px] font-bold tabular-nums">{formatDepart(ride.depart_at)} 출발</p>
          <div className="mt-4">
            <Route origin={ride.origin} destination={ride.destination} size="lg" />
          </div>
          <dl className="mt-5 space-y-2 border-t border-zinc-100 pt-4 text-[15px]">
            {facts.map(([k, v]) => (
              <div key={k} className="flex gap-4">
                <dt className="w-16 shrink-0 text-zinc-400">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          {ride.note && (
            <p className="mt-4 rounded-xl bg-zinc-50 px-3.5 py-3 text-[15px] whitespace-pre-wrap text-zinc-700">
              {ride.note}
            </p>
          )}
        </section>

        <section className="card mt-2.5">
          <h2 className="label mb-3">같이 타는 사람</h2>
          <ul className="space-y-2.5">
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center gap-2.5">
                <Avatar id={m.user_id} name={m.profile?.nickname ?? "?"} />
                <span className="font-medium">{m.profile?.nickname ?? "알 수 없음"}</span>
                {m.user_id === ride.host_id && <span className="text-[13px] text-zinc-400">방장</span>}
                {m.user_id === profile.id && m.user_id !== ride.host_id && (
                  <span className="text-[13px] text-zinc-400">나</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md bg-gradient-to-t from-zinc-50 from-70% to-transparent px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {isMember ? (
          <Link href={`/rides/${ride.id}/chat`} className="btn-primary w-full">
            채팅방으로
          </Link>
        ) : (
          <JoinButton rideId={ride.id} blocker={joinBlocker(ride, profile)} />
        )}
      </div>
    </>
  );
}
