"use client";

import { useEffect, useState } from "react";
import { CloseIcon } from "@/components/icons";
import { canPromptInstall, isIos, isStandalone, onInstallAvailable, promptInstall } from "@/lib/pwa";
import { getFlag, setFlag } from "@/lib/storage";
import InstallGuide from "./InstallGuide";

const DISMISSED = "install-banner-dismissed";

export default function InstallBanner() {
  const [mode, setMode] = useState<"none" | "prompt" | "ios">("none");
  const [guide, setGuide] = useState(false);

  useEffect(() => {
    if (isStandalone() || getFlag(DISMISSED)) return;
    const update = () => setMode(canPromptInstall() ? "prompt" : isIos() ? "ios" : "none");
    update();
    return onInstallAvailable(update);
  }, []);

  if (mode === "none") return null;

  const dismiss = () => {
    setFlag(DISMISSED);
    setMode("none");
  };

  return (
    <>
      <div className="flex items-center gap-3 rounded-2xl bg-zinc-900 py-3 pr-2 pl-4 text-white">
        <p className="min-w-0 flex-1 text-[14px] leading-snug">
          <b className="font-semibold">앱처럼 쓰기</b>
          <span className="block text-[13px] text-zinc-400">홈 화면에 추가하면 알림도 받을 수 있어요</span>
        </p>
        <button
          className="shrink-0 rounded-lg bg-taxi px-3 py-1.5 text-[13px] font-semibold text-zinc-900"
          onClick={async () => {
            if (mode === "prompt") {
              if (await promptInstall()) dismiss();
            } else {
              setGuide(true);
            }
          }}
        >
          {mode === "prompt" ? "설치" : "방법 보기"}
        </button>
        <button className="grid size-8 shrink-0 place-items-center text-zinc-500" onClick={dismiss} aria-label="닫기">
          <CloseIcon size={18} />
        </button>
      </div>
      {guide && <InstallGuide onClose={() => setGuide(false)} />}
    </>
  );
}
