"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function BlockList({
  userId,
  blocks: initial,
}: {
  userId: string;
  blocks: { id: string; nickname: string }[];
}) {
  const router = useRouter();
  const [blocks, setBlocks] = useState(initial);

  async function unblock(id: string) {
    const { error } = await createClient().from("blocks").delete().eq("blocker_id", userId).eq("blocked_id", id);
    if (!error) {
      setBlocks((prev) => prev.filter((b) => b.id !== id));
      router.refresh();
    }
  }

  if (!blocks.length) return <p className="text-sm text-zinc-400">차단한 사람이 없어요.</p>;

  return (
    <ul className="divide-y divide-zinc-100">
      {blocks.map((b) => (
        <li key={b.id} className="flex items-center justify-between py-2.5 text-[15px]">
          {b.nickname}
          <button className="text-[13px] text-zinc-500" onClick={() => unblock(b.id)}>
            차단 해제
          </button>
        </li>
      ))}
    </ul>
  );
}
