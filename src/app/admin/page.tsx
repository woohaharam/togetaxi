import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { requireProfile } from "@/lib/auth";
import { formatDepart, won } from "@/lib/format";
import ResolveButton from "./ResolveButton";

type Daily = { day: string; signups: number; rides: number };
type Ranked = { label: string; n: number };
type Stats = {
  users: number;
  users_7d: number;
  schools: number;
  rides: number;
  rides_7d: number;
  open_now: number;
  finished: number;
  matched: number;
  messages: number;
  settled: number;
  saved: number;
  daily: Daily[];
  top_schools: Ranked[];
  top_routes: Ranked[];
};

type Inbox = {
  reports: {
    id: number;
    reason: keyof typeof REASON;
    detail: string | null;
    created_at: string;
    reporter: string;
    target: string | null;
    ride: string | null;
  }[];
  feedback: { id: number; content: string; created_at: string; author: string | null }[];
};

const REASON = {
  no_show: "노쇼",
  fraud: "정산·금전 문제",
  abuse: "욕설·불쾌한 행동",
  spam: "광고·무관한 글",
  other: "기타",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { supabase } = await requireProfile();
  const [{ data, error }, { data: inboxData }] = await Promise.all([
    supabase.rpc("admin_stats"),
    supabase.rpc("admin_inbox"),
  ]);
  if (error || !data) notFound();
  const s = data as Stats;
  const inbox = (inboxData as Inbox | null) ?? { reports: [], feedback: [] };

  const matchRate = s.finished ? Math.round((s.matched / s.finished) * 100) : null;

  return (
    <>
      <PageHeader title="운영 통계" back="/my" />
      <main className="space-y-6 px-4 pb-16">
        <section className="card">
          <h2 className="text-[15px] font-semibold">
            처리할 신고 <span className="text-zinc-400">{inbox.reports.length}</span>
          </h2>
          {inbox.reports.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-400">새 신고가 없어요.</p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-100">
              {inbox.reports.map((r) => (
                <li key={r.id} className="flex gap-3 py-3">
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-semibold">
                      {REASON[r.reason]}
                      {r.target && <span className="font-normal text-zinc-500"> · 대상 {r.target}</span>}
                    </p>
                    {r.ride && <p className="truncate text-zinc-500">{r.ride}</p>}
                    {r.detail && <p className="mt-1 whitespace-pre-wrap text-zinc-700">{r.detail}</p>}
                    <p className="mt-1 text-xs text-zinc-400">
                      {r.reporter} · {formatDepart(r.created_at)}
                    </p>
                  </div>
                  <ResolveButton id={r.id} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="grid grid-cols-2 gap-2.5">
          <Tile label="가입자" value={s.users.toLocaleString()} sub={`최근 7일 +${s.users_7d}`} />
          <Tile label="참여 학교" value={s.schools.toLocaleString()} />
          <Tile label="모집 글" value={s.rides.toLocaleString()} sub={`최근 7일 +${s.rides_7d}`} />
          <Tile label="지금 모집 중" value={s.open_now.toLocaleString()} />
          <Tile
            label="매칭 성공률"
            value={matchRate === null ? "–" : `${matchRate}%`}
            sub={`출발한 ${s.finished}건 중 ${s.matched}건이 2명 이상`}
          />
          <Tile label="채팅 메시지" value={s.messages.toLocaleString()} />
          <Tile
            label="학생들이 아낀 택시비"
            value={won(s.saved)}
            sub={`정산 ${s.settled}건 기준, 각자 따로 탔을 때와 비교`}
            wide
          />
        </section>

        <DailyBars title="일별 가입자" days={s.daily} pick={(d) => d.signups} unit="명" />
        <DailyBars title="일별 모집 글" days={s.daily} pick={(d) => d.rides} unit="건" />

        <RankList title="학교별 가입자" rows={s.top_schools} unit="명" />
        <RankList title="많이 모인 경로" rows={s.top_routes} unit="건" />

        <section className="card">
          <h2 className="text-[15px] font-semibold">최근 의견</h2>
          {inbox.feedback.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-400">아직 받은 의견이 없어요.</p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-100">
              {inbox.feedback.map((f) => (
                <li key={f.id} className="py-3 text-sm">
                  <p className="whitespace-pre-wrap text-zinc-800">{f.content}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {f.author ?? "탈퇴한 사용자"} · {formatDepart(f.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

function Tile({ label, value, sub, wide }: { label: string; value: string; sub?: string; wide?: boolean }) {
  return (
    <div className={`card ${wide ? "col-span-2" : ""}`}>
      <p className="text-[13px] text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-400">{sub}</p>}
    </div>
  );
}

function DailyBars({
  title,
  days,
  pick,
  unit,
}: {
  title: string;
  days: Daily[];
  pick: (d: Daily) => number;
  unit: string;
}) {
  const values = days.map(pick);
  const max = Math.max(1, ...values);
  const total = values.reduce((a, b) => a + b, 0);

  return (
    <section className="card">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <p className="text-[13px] text-zinc-500">
          최근 14일 {total}
          {unit}
        </p>
      </div>
      <div className="mt-4 flex h-28 items-end gap-[2px] border-b border-zinc-200" role="img" aria-label={`${title} 막대 그래프`}>
        {days.map((d, i) => {
          const v = values[i];
          return (
            <div key={d.day} className="group relative flex h-full flex-1 items-end justify-center">
              <div
                className="w-full max-w-4 rounded-t-[4px] bg-zinc-800 group-hover:bg-zinc-600"
                style={{ height: v ? `${(v / max) * 100}%` : 0 }}
              />
              <span className="pointer-events-none absolute -top-6 z-10 hidden rounded bg-zinc-900 px-1.5 py-0.5 text-[11px] whitespace-nowrap text-white group-hover:block">
                {Number(d.day.slice(5, 7))}/{Number(d.day.slice(8))} · {v}
                {unit}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-zinc-400 tabular-nums">
        <span>{shortDay(days[0]?.day)}</span>
        <span>오늘</span>
      </div>
    </section>
  );
}

function RankList({ title, rows, unit }: { title: string; rows: Ranked[]; unit: string }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <section className="card">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-400">아직 데이터가 없어요.</p>
      ) : (
        <ol className="mt-3 space-y-2.5">
          {rows.map((r) => (
            <li key={r.label}>
              <div className="flex justify-between gap-3 text-sm">
                <span className="truncate">{r.label}</span>
                <span className="shrink-0 text-zinc-500 tabular-nums">
                  {r.n}
                  {unit}
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-zinc-100">
                <div className="h-full rounded-full bg-zinc-800" style={{ width: `${(r.n / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function shortDay(day?: string) {
  return day ? `${Number(day.slice(5, 7))}/${Number(day.slice(8))}` : "";
}
