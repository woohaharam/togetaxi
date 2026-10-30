import Link from "next/link";
import { BackIcon } from "./icons";

export default function PageHeader({ title, back = "/" }: { title: string; back?: string }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-zinc-50/95 px-2 backdrop-blur">
      <Link href={back} className="grid size-10 place-items-center rounded-full active:bg-zinc-200" aria-label="뒤로">
        <BackIcon />
      </Link>
      <h1 className="text-[17px] font-semibold">{title}</h1>
    </header>
  );
}
