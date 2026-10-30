import RideCardSkeleton from "@/components/RideCardSkeleton";

export default function HomeLoading() {
  return (
    <main className="space-y-2.5 px-4 pt-[7.5rem]" aria-busy>
      <span className="sr-only">모집 목록을 불러오는 중</span>
      {[0, 1, 2].map((i) => (
        <RideCardSkeleton key={i} />
      ))}
    </main>
  );
}
