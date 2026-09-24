import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="font-semibold">찾는 페이지가 없어요</p>
      <p className="mt-1 text-sm text-zinc-500">모집이 지워졌거나 주소가 잘못됐어요.</p>
      <Link href="/" className="btn-primary mt-6 px-6 py-2.5 text-[15px]">
        홈으로
      </Link>
    </main>
  );
}
