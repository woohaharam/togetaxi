"use client";

import { useEffect, useId, useRef, useState } from "react";

const UNIT = process.env.NEXT_PUBLIC_ADFIT_UNIT;
const SCRIPT_SRC = "https://t1.kakaocdn.net/kas/static/ba.min.js";

/**
 * 카카오 애드핏 배너 (320x100). NEXT_PUBLIC_ADFIT_UNIT 이 없으면 아무것도 그리지 않는다.
 * 애드핏 스크립트는 로드될 때 한 번만 광고 영역을 찾기 때문에, 화면 이동 후에도 뜨도록 매번 새로 붙인다.
 * 채울 광고가 없으면(onfail) 빈 칸이 남지 않게 통째로 숨긴다.
 */
export default function AdSlot() {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const onFail = `adfitFail_${useId().replace(/\W/g, "")}`;

  useEffect(() => {
    const box = ref.current;
    if (!UNIT || !box) return;

    const w = window as unknown as Record<string, unknown>;
    w[onFail] = () => setFailed(true);

    const ins = document.createElement("ins");
    ins.className = "kakao_ad_area";
    ins.style.display = "none";
    ins.setAttribute("data-ad-unit", UNIT);
    ins.setAttribute("data-ad-width", "320");
    ins.setAttribute("data-ad-height", "100");
    ins.setAttribute("data-ad-onfail", onFail);

    const script = document.createElement("script");
    script.async = true;
    script.src = SCRIPT_SRC;
    script.onerror = () => setFailed(true);

    box.append(ins, script);
    return () => {
      box.replaceChildren();
      delete w[onFail];
    };
  }, [onFail]);

  if (!UNIT || failed) return null;

  return (
    <aside className="card overflow-hidden px-0 pt-2 pb-3">
      <p className="px-4 pb-2 text-[11px] text-zinc-400">광고</p>
      <div ref={ref} className="flex min-h-[100px] justify-center" />
    </aside>
  );
}
