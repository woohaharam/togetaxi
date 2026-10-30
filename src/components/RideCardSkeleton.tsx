/** 목록을 불러오는 동안 카드 자리를 잡아 둔다. 실제 카드와 높이를 맞춘다. */
export default function RideCardSkeleton() {
  return (
    <div className="card" aria-hidden>
      <div className="mb-3 flex items-center justify-between">
        <span className="skeleton h-4 w-24" />
        <span className="skeleton h-5 w-12" />
      </div>
      <div className="space-y-2">
        <span className="skeleton block h-5 w-2/5" />
        <span className="skeleton block h-5 w-3/5" />
      </div>
      <span className="skeleton mt-3 block h-3.5 w-20" />
    </div>
  );
}
