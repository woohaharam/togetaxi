"use client";

import { useEffect, useState } from "react";
import { disablePush, enablePush, getPushState, type PushState } from "@/lib/pwa";
import InstallGuide from "./InstallGuide";

const DESCRIPTION: Record<PushState, string> = {
  on: "누가 내 모집에 들어오거나 새 메시지가 오면 알려 드려요.",
  off: "켜 두면 누가 내 모집에 들어오거나 새 메시지가 올 때 알려 드려요.",
  denied: "브라우저에서 알림이 차단돼 있어요. 설정 → 사이트 설정 → 알림에서 허용해 주세요.",
  "needs-install": "아이폰은 홈 화면에 추가한 앱에서만 알림을 받을 수 있어요.",
  unsupported: "이 브라우저는 알림을 지원하지 않아요.",
};

export default function PushToggle() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [guide, setGuide] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getPushState().then(setState);
  }, []);

  if (!state) return <div className="h-12" />;

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      setState(state === "on" ? await disablePush() : await enablePush());
    } catch {
      setError("알림 설정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
    setBusy(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-[13px] text-zinc-500">{DESCRIPTION[state]}</p>
        {(state === "on" || state === "off") && (
          <button
            role="switch"
            aria-checked={state === "on"}
            aria-label="알림"
            disabled={busy}
            onClick={toggle}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${state === "on" ? "bg-zinc-900" : "bg-zinc-300"}`}
          >
            <span
              className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-[left] ${state === "on" ? "left-[22px]" : "left-0.5"}`}
            />
          </button>
        )}
        {state === "needs-install" && (
          <button className="shrink-0 text-[13px] font-semibold text-zinc-900 underline" onClick={() => setGuide(true)}>
            방법 보기
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      {guide && <InstallGuide onClose={() => setGuide(false)} />}
    </div>
  );
}
