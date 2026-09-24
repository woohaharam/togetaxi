import Link from "next/link";
import { formatDepart, perPerson, universityLabel, won } from "@/lib/format";
import { rideState } from "@/lib/rides";
import type { RideWithUniversity } from "@/lib/types";
import Route from "./Route";

const BADGE = {
  open: "bg-taxi text-zinc-900",
  full: "bg-zinc-100 text-zinc-500",
  closed: "bg-zinc-100 text-zinc-500",
  departed: "bg-zinc-100 text-zinc-400",
  cancelled: "bg-zinc-100 text-zinc-400",
};

export default function RideCard({
  ride,
  showUniversity,
}: {
  ride: RideWithUniversity;
  showUniversity?: boolean;
}) {
  const state = rideState(ride);
  const dim = state !== "open";

  return (
    <Link
      href={`/rides/${ride.id}`}
      className={`card block transition active:scale-[0.99] ${dim ? "opacity-55" : ""}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[15px] font-bold tabular-nums">{formatDepart(ride.depart_at)}</span>
        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${BADGE[state]}`}>
          {state === "open" ? `${ride.member_count}/${ride.capacity}명` : STATE_LABEL[state]}
        </span>
      </div>

      <Route origin={ride.origin} destination={ride.destination} />

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-zinc-500">
        {ride.estimated_fare ? (
          <span>1인 약 {won(perPerson(ride.estimated_fare, ride.capacity))}</span>
        ) : null}
        {ride.same_gender_only && <span>{ride.host_gender === "female" ? "여자만" : "남자만"}</span>}
        {showUniversity && ride.university && <span>{universityLabel(ride.university)}</span>}
      </div>
    </Link>
  );
}

const STATE_LABEL = {
  full: "정원 마감",
  closed: "모집 마감",
  departed: "출발함",
  cancelled: "취소됨",
};
