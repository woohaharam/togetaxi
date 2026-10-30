"use client";

import Sheet from "@/components/Sheet";

function ShareGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="inline -mt-1" aria-hidden>
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}

export default function InstallGuide({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="홈 화면에 추가하기" onClose={onClose}>
      <ol className="space-y-4 pb-2 text-[15px]">
        <li className="flex gap-3">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-zinc-900 text-[13px] font-semibold text-white">1</span>
          <span>
            화면 아래(크롬은 위)의 공유 버튼 <ShareGlyph />을 눌러요.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-zinc-900 text-[13px] font-semibold text-white">2</span>
          <span>
            목록을 내려서 <b className="font-semibold">홈 화면에 추가</b>를 눌러요.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-zinc-900 text-[13px] font-semibold text-white">3</span>
          <span>홈 화면에 생긴 같이타 아이콘으로 열면 앱처럼 쓸 수 있고, 알림도 받을 수 있어요.</span>
        </li>
      </ol>
      <p className="mt-3 rounded-xl bg-zinc-50 px-3.5 py-3 text-[13px] text-zinc-500">
        홈 화면 앱에서는 로그인을 한 번 더 해야 해요. 브라우저와 따로 저장되기 때문이에요.
      </p>
      <button className="btn-primary mt-4 w-full" onClick={onClose}>
        알겠어요
      </button>
    </Sheet>
  );
}
