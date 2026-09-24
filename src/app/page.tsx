import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import RideCard from "@/components/RideCard";
import { requireProfile } from "@/lib/auth";
import { universityLabel } from "@/lib/format";
import type { RideWithUniversity } from "@/lib/types";

type SearchParams = Promise<{ scope?: string; q?: string }>;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const { supabase, profile } = await requireProfile();
  const { scope = "school", q = "" } = await searchParams;
  const keyword = q.trim().replace(/[%,()]/g, "");

  // 출발 30분 지난 공고까지 보여줌
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  let query = supabase
    .from("rides")
    .select("*, university:universities!inner(id, name, campus, region)")
    .neq("status", "cancelled")
    .gte("depart_at", since)
    .order("depart_at")
    .limit(100);

  if (scope === "school") query = query.eq("university_id", profile.university_id);
  if (scope === "region") query = query.eq("university.region", profile.university.region);
  if (keyword) query = query.or(`origin.ilike.%${keyword}%,destination.ilike.%${keyword}%`);

  const { data } = await query.returns<RideWithUniversity[]>();
  const rides = data ?? [];

  const tabs = [
    { key: "school", label: "우리 학교" },
    { key: "region", label: profile.university.region },
    { key: "all", label: "전국" },
  ];

  return (
    <>
      <header className="sticky top-0 z-10 bg-zinc-50/95 px-4 pt-5 pb-3 backdrop-blur">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-zinc-500">{universityLabel(profile.university)}</p>
            <h1 className="text-2xl font-extrabold">
              같이<span className="bg-taxi px-0.5">타</span>
            </h1>
          </div>
          <Link href="/rides/new" className="btn-taxi px-3 py-2 text-sm">
            + 공고 올리기
          </Link>
        </div>

        <form className="mt-4">
          <input type="hidden" name="scope" value={scope} />
          <input
            name="q"
            defaultValue={q}
            className="input py-2.5"
            placeholder="🔍 어디로 가세요? (예: 신경주역)"
          />
        </form>

        <div className="mt-3 flex gap-2">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={{ pathname: "/", query: { scope: t.key, ...(q ? { q } : {}) } }}
              className="chip"
              data-active={scope === t.key}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </header>

      <main className="space-y-3 px-4 pt-1 pb-28">
        {rides.length === 0 ? (
          <div className="py-20 text-center text-zinc-400">
            <div className="mb-3 text-4xl">🚕</div>
            <p>아직 올라온 공고가 없어요</p>
            <Link href="/rides/new" className="mt-4 inline-block text-sm font-semibold text-zinc-900 underline">
              첫 공고를 올려보세요
            </Link>
          </div>
        ) : (
          rides.map((ride) => (
            <RideCard
              key={ride.id}
              ride={ride}
              showUniversity={scope !== "school" && ride.university_id !== profile.university_id}
            />
          ))
        )}
      </main>
      <BottomNav />
    </>
  );
}
