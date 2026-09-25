"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/format";
import Sheet from "./Sheet";

const REASONS = [
  ["no_show", "약속 장소에 안 나왔어요"],
  ["fraud", "정산을 안 하거나 돈 문제가 있었어요"],
  ["abuse", "욕설, 성희롱, 불쾌한 행동"],
  ["spam", "광고나 택시와 관계없는 글"],
  ["other", "기타"],
] as const;

type Reason = (typeof REASONS)[number][0];

export default function ReportSheet({
  meId,
  rideId,
  target,
  onClose,
}: {
  meId: string;
  rideId?: string;
  target?: { id: string; name: string };
  onClose: () => void;
}) {
  const [reason, setReason] = useState<Reason | null>(null);
  const [detail, setDetail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return;
    setState("sending");
    setError("");
    const { error } = await createClient()
      .from("reports")
      .insert({
        reporter_id: meId,
        ride_id: rideId ?? null,
        target_user_id: target?.id ?? null,
        reason,
        detail: detail.trim() || null,
      });
    if (error) {
      setState("idle");
      setError(errorMessage(error));
      return;
    }
    setState("done");
  }

  const title = target ? `${target.name}님 신고하기` : "모집 신고하기";

  if (state === "done") {
    return (
      <Sheet title={title} onClose={onClose}>
        <p className="pb-2 text-[15px] text-zinc-600">
          신고가 접수됐어요. 운영자가 확인하고 필요하면 이용을 제한할게요.
          {target && " 다시 마주치고 싶지 않다면 차단도 해 두세요."}
        </p>
        <button className="btn-primary mt-4 w-full" onClick={onClose}>
          확인
        </button>
      </Sheet>
    );
  }

  return (
    <Sheet title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <fieldset className="space-y-1">
          {REASONS.map(([value, text]) => (
            <label key={value} className="flex cursor-pointer items-center gap-3 rounded-xl px-1 py-2.5">
              <input
                type="radio"
                name="reason"
                className="size-4 accent-zinc-900"
                checked={reason === value}
                onChange={() => setReason(value)}
              />
              <span className="text-[15px]">{text}</span>
            </label>
          ))}
        </fieldset>
        <textarea
          className="input min-h-20 resize-none text-[15px]"
          maxLength={500}
          placeholder="자세한 상황을 적어 주면 확인이 빨라요 (선택)"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button className="btn-primary w-full" disabled={!reason || state === "sending"}>
          신고하기
        </button>
      </form>
    </Sheet>
  );
}
