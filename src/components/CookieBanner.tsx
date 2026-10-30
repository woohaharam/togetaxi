"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getConsent, onConsentChange, setConsent } from "@/lib/consent";

/** 광고 쿠키 동의를 묻는다. 고르기 전에는 광고가 나오지 않는다. */
export default function CookieBanner() {
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    const sync = () => setAsking(getConsent() === null);
    sync();
    return onConsentChange(sync);
  }, []);

  if (!asking) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-zinc-200 bg-white px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <p className="text-[14px] leading-relaxed text-zinc-700">
        광고를 보여주는 데 쿠키를 써요. 동의하지 않아도 같이타의 모든 기능을 그대로 쓸 수 있어요.{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          자세히
        </Link>
      </p>
      <div className="mt-3 flex gap-2">
        <button className="btn-ghost flex-1 py-2.5 text-[15px]" onClick={() => setConsent("denied")}>
          거부
        </button>
        <button className="btn-primary flex-1 py-2.5 text-[15px]" onClick={() => setConsent("granted")}>
          동의
        </button>
      </div>
    </div>
  );
}
