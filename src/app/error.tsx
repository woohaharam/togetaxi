"use client";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="font-semibold">화면을 불러오지 못했어요</p>
      <p className="mt-1 text-sm text-zinc-500">인터넷 연결을 확인하고 다시 시도해 주세요.</p>
      <button onClick={reset} className="btn-primary mt-6 px-6 py-2.5 text-[15px]">
        다시 시도
      </button>
    </main>
  );
}
