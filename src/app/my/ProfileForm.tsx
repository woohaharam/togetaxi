"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/format";

export default function ProfileForm({ nickname: n, payLink: p }: { nickname: string; payLink: string }) {
  const router = useRouter();
  const [nickname, setNickname] = useState(n);
  const [payLink, setPayLink] = useState(p);
  const [status, setStatus] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("profiles")
      .update({ nickname: nickname.trim(), pay_link: payLink.trim() || null })
      .eq("id", user!.id);
    setStatus(error ? errorMessage(error) : "저장했어요");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="mt-4 space-y-3 border-t border-zinc-100 pt-4">
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-500">닉네임</label>
        <input
          className="input py-2"
          minLength={2}
          maxLength={12}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-500">정산 받을 곳 (방장일 때 표시)</label>
        <input
          className="input py-2"
          maxLength={200}
          placeholder="토스/카카오페이 송금 링크 또는 은행 계좌"
          value={payLink}
          onChange={(e) => setPayLink(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary py-2 text-sm">저장</button>
        {status && <span className="text-sm text-zinc-500">{status}</span>}
      </div>
    </form>
  );
}
