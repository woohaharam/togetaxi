"use client";

import { useEffect, useState } from "react";
import { getConsent, onConsentChange, setConsent, type Consent } from "@/lib/consent";

export default function AdConsent() {
  const [value, setValue] = useState<Consent>(null);

  useEffect(() => {
    const sync = () => setValue(getConsent());
    sync();
    return onConsentChange(sync);
  }, []);

  const on = value === "granted";

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-[13px] text-zinc-500">
        {on
          ? "맞춤 광고를 위해 쿠키를 쓰고 있어요. 언제든 끌 수 있어요."
          : "광고 쿠키를 쓰지 않고 있어요. 꺼 둬도 모든 기능을 그대로 쓸 수 있어요."}
      </p>
      <button
        role="switch"
        aria-checked={on}
        aria-label="광고 쿠키"
        onClick={() => setConsent(on ? "denied" : "granted")}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-zinc-900" : "bg-zinc-400"}`}
      >
        <span
          className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-[left] ${on ? "left-[22px]" : "left-0.5"}`}
        />
      </button>
    </div>
  );
}
