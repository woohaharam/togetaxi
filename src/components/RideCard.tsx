import Link from "next/link";
import { formatDepart, perPerson, universityLabel, won } from "@/lib/format";
import type { RideWithUniversity } from "@/lib/types";

export default function RideCard({
  ride,
  showUniversity,
}: {
  ride: RideWithUniversity;
  showUniversity?: boolean;
}) {
  const full = ride.member_count >= ride.capacity;
  const closed = ride.status !== "open" || full;
  const departed = new Date(ride.depart_at) < new Date();

  return (
    <Link href={`/rides/${ride.id}`} className={`card block ${closed || departed ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-900">{formatDepart(ride.depart_at)}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            ride.status === "cancelled"
              ? "bg-zinc-100 text-zinc-400"
              : closed
                ? "bg-zinc-100 text-zinc-500"
                : "bg-taxi text-zinc-900"
          }`}
        >
          {ride.status === "cancelled"
            ? "취소됨"
            : closed
              ? "모집마감"
              : `${ride.member_count}/${ride.capacity}명`}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2 text-lg font-bold">
        <span className="truncate">{ride.origin}</span>
        <span className="shrink-0 text-zinc-300">→</span>
        <span className="truncate">{ride.destination}</span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
        {ride.same_gender_only && (
          <span className="rounded bg-pink-50 px-1.5 py-0.5 text-pink-600">
            {ride.host_gender === "female" ? "여성만" : "남성만"}
          </span>
        )}
        {ride.estimated_fare ? (
          <span className="rounded bg-zinc-100 px-1.5 py-0.5">
            예상 1인 {won(perPerson(ride.estimated_fare, ride.capacity))}
          </span>
        ) : null}
        {showUniversity && ride.university && (
          <span className="rounded bg-zinc-100 px-1.5 py-0.5">{universityLabel(ride.university)}</span>
        )}
      </div>
    </Link>
  );
}
