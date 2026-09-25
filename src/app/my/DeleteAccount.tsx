"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/format";

export default function DeleteAccount() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    const ok = window.confirm(
      "탈퇴하면 프로필과 기록이 지워지고 되돌릴 수 없어요.\n방장인 모집은 취소되고, 참여 중인 모집에서는 나가게 돼요.\n\n정말 탈퇴할까요?",
    );
    if (!ok) return;
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.rpc("delete_account");
    if (error) {
      setLoading(false);
      setError(errorMessage(error));
      return;
    }
    await supabase.auth.signOut();
    window.location.replace("/login");
  }

  return (
    <div className="text-center">
      <button className="text-[13px] text-zinc-400 underline underline-offset-2" onClick={remove} disabled={loading}>
        {loading ? "탈퇴 처리 중" : "탈퇴하기"}
      </button>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
