/** 출발 → 도착을 노선도처럼 세로로 보여준다 */
export default function Route({
  origin,
  destination,
  size = "md",
}: {
  origin: string;
  destination: string;
  size?: "md" | "lg";
}) {
  const text = size === "lg" ? "text-lg" : "text-[15px]";
  return (
    <div className="grid grid-cols-[12px_1fr] gap-x-3">
      <div className="flex flex-col items-center pt-[7px]">
        <span className="size-2 rounded-full border-2 border-zinc-400" />
        <span className="my-1 w-px flex-1 bg-zinc-300" />
        <span className="size-2 rounded-full bg-zinc-900" />
      </div>
      <div className={`space-y-2 font-semibold ${text}`}>
        <p className="truncate text-zinc-500">{origin}</p>
        <p className="truncate">{destination}</p>
      </div>
    </div>
  );
}
