"use client";

import { useState } from "react";
import ReportSheet from "@/components/ReportSheet";

export default function ReportRideButton({ meId, rideId }: { meId: string; rideId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="mt-5 w-full text-center text-[13px] text-zinc-400" onClick={() => setOpen(true)}>
        이 모집 신고하기
      </button>
      {open && <ReportSheet meId={meId} rideId={rideId} onClose={() => setOpen(false)} />}
    </>
  );
}
