import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="text-4xl">🚕💨</div>
      <p className="text-zinc-500">공고를 찾을 수 없어요</p>
      <Link href="/" className="btn-primary">
        홈으로
      </Link>
    </main>
  );
}
