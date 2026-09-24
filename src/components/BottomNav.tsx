"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, PlusIcon, TicketIcon } from "./icons";

const TABS = [
  { href: "/", label: "홈", Icon: HomeIcon },
  { href: "/rides/new", label: "모집하기", Icon: PlusIcon },
  { href: "/my", label: "내 택시", Icon: TicketIcon },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md border-t border-zinc-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      {TABS.map(({ href, label, Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] ${
              active ? "font-semibold text-zinc-900" : "text-zinc-400"
            }`}
          >
            <Icon size={22} strokeWidth={active ? 2.1 : 1.8} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
