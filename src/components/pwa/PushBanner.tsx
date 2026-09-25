"use client";

import { useEffect, useState } from "react";
import { CloseIcon } from "@/components/icons";
import { clearNotifications, enablePush, getPushState, type PushState } from "@/lib/pwa";
import { getFlag, setFlag } from "@/lib/storage";
import InstallGuide from "./InstallGuide";

const DISMISSED = "push-banner-dismissed";

/** 채팅방 위에 한 줄: 알림이 꺼져 있으면 켜자고 권한다 */
export default function PushBanner({ tag }: { tag: string }) {
  const [state, setState] = useState<PushState | null>(null);
  const [guide, setGuide] = useState(false);

  useEffect(() => {
    clearNotifications(tag);
    if (!getFlag(DISMISSED)) getPushState().then(setState);
  }, [tag]);

  if (state !== "off" && state !== "needs-install") return null;

  const dismiss = () => {
    setFlag(DISMISSED);
    setState(null);
  };

  return (
    <>
      <div className="flex items-center gap-2 border-t border-zinc-100 bg-zinc-50 py-2 pr-1 pl-4 text-[13px]">
        <p className="min-w-0 flex-1 text-zinc-600">
          {state === "off" ? "알림을 켜면 새 메시지를 놓치지 않아요" : "홈 화면에 추가하면 알림을 받을 수 있어요"}
        </p>
        <button
          className="shrink-0 rounded-lg bg-zinc-900 px-2.5 py-1 font-semibold text-white"
          onClick={async () => {
            if (state === "needs-install") return setGuide(true);
            try {
              setState(await enablePush());
            } catch {
              setState("off");
            }
          }}
        >
          {state === "off" ? "알림 켜기" : "방법 보기"}
        </button>
        <button className="grid size-8 shrink-0 place-items-center text-zinc-400" onClick={dismiss} aria-label="닫기">
          <CloseIcon size={16} />
        </button>
      </div>
      {guide && <InstallGuide onClose={() => setGuide(false)} />}
    </>
  );
}
