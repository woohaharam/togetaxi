export default function RideLoading() {
  return (
    <main className="px-4 pt-16" aria-busy>
      <span className="sr-only">모집 정보를 불러오는 중</span>
      <div className="card space-y-4">
        <span className="skeleton block h-4 w-28" />
        <div className="space-y-2">
          <span className="skeleton block h-6 w-2/5" />
          <span className="skeleton block h-6 w-3/5" />
        </div>
        <div className="space-y-2 border-t border-zinc-100 pt-4">
          {[0, 1, 2].map((i) => (
            <span key={i} className="skeleton block h-4 w-4/5" />
          ))}
        </div>
      </div>
    </main>
  );
}
