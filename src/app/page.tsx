import Link from "next/link";
import { Fragment } from "react";
import AdSlot from "@/components/AdSlot";
import BottomNav from "@/components/BottomNav";
import RideCard from "@/components/RideCard";
import { SearchIcon } from "@/components/icons";
import { requireProfile } from "@/lib/auth";
import { universityLabel } from "@/lib/format";
import type { RideWithUniversity } from "@/lib/types";

type Scope = "school" | "region" | "all";

const AD_AFTER = 3;
type SearchParams = Promise<{ scope?: string; q?: string }>;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const { supabase, profile } = await requireProfile();
  const params = await searchParams;
  const scope: Scope = params.scope === "region" || params.scope === "all" ? params.scope : "school";
  const q = (params.q ?? "").trim();
  // PostgREST or() 문법을 깨는 문자는 뺀다
  const keyword = q.replace(/[%,()*\\]/g, "");

  // 출발하고 30분까지는 목록에 남겨 둔다
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

  const { data: blocks } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", profile.id);
  if (blocks?.length) query = query.not("host_id", "in", `(${blocks.map((b) => b.blocked_id).join(",")})`);

  const { data: rides } = await query.returns<RideWithUniversity[]>();

  const tabs: { key: Scope; label: string }[] = [
    { key: "school", label: "우리 학교" },
    { key: "region", label: `${profile.university.region} 전체` },
    { key: "all", label: "전국" },
  ];

  return (
    <>
      <header className="sticky top-0 z-10 bg-zinc-50/95 px-4 pt-4 pb-3 backdrop-blur">
        <div className="flex items-baseline justify-between">
          <p className="text-[22px] font-extrabold tracking-tight">
            같이타<span className="text-taxi">.</span>
          </p>
          <p className="truncate pl-4 text-[13px] text-zinc-500">{universityLabel(profile.university)}</p>
        </div>

        <form className="relative mt-3" role="search">
          <input type="hidden" name="scope" value={scope} />
          <SearchIcon size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            name="q"
            defaultValue={q}
            className="input py-2.5 pl-10"
            placeholder="어디로 가세요?"
            enterKeyHint="search"
          />
        </form>

        <nav className="mt-3 flex gap-1.5">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={{ pathname: "/", query: { scope: t.key, ...(q ? { q } : {}) } }}
              className="chip"
              data-active={scope === t.key}
              replace
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="space-y-2.5 px-4 pt-1 pb-28">
        {!rides?.length ? (
          <div className="pt-24 text-center">
            <p className="font-semibold text-zinc-700">
              {keyword ? `'${q}' 가는 모집이 아직 없어요` : "지금 모집 중인 택시가 없어요"}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              {scope === "school" ? "범위를 넓혀 보거나 " : ""}직접 모집을 열어 보세요.
            </p>
            <Link href="/rides/new" className="btn-taxi mt-5 px-5 py-2.5 text-[15px]">
              모집하기
            </Link>
          </div>
        ) : (
          rides.map((ride, i) => (
            <Fragment key={ride.id}>
              <RideCard ride={ride} showUniversity={ride.university_id !== profile.university_id} />
              {/* 모집 글이 어느 정도 있을 때만, 세 번째 글 뒤에 한 칸 */}
              {i === AD_AFTER - 1 && rides.length > AD_AFTER && <AdSlot />}
            </Fragment>
          ))
        )}
      </main>
      <BottomNav />
    </>
  );
}
