const TONES = [
  "bg-amber-100 text-amber-800",
  "bg-sky-100 text-sky-800",
  "bg-emerald-100 text-emerald-800",
  "bg-rose-100 text-rose-800",
  "bg-violet-100 text-violet-800",
  "bg-lime-100 text-lime-800",
];

function tone(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}

export default function Avatar({ id, name, size = 32 }: { id: string; name: string; size?: number }) {
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full font-semibold ${tone(id)}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {name.slice(0, 1)}
    </span>
  );
}
