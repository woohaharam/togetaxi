"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResolveButton({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="shrink-0 rounded-lg bg-zinc-100 px-2.5 py-1 text-[12px] text-zinc-600 disabled:opacity-40"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await createClient().rpc("resolve_report", { p_report: id });
        router.refresh();
      }}
    >
      처리 완료
    </button>
  );
}
