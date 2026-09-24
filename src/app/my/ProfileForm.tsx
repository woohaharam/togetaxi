"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/format";

export default function ProfileForm({
  userId,
  nickname: initialNickname,
  payLink: initialPayLink,
}: {
  userId: string;
  nickname: string;
  payLink: string;
}) {
  const router = useRouter();
  const [nickname, setNickname] = useState(initialNickname);
  const [payLink, setPayLink] = useState(initialPayLink);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const dirty = nickname.trim() !== initialNickname || payLink.trim() !== initialPayLink;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus("");
    const { error } = await createClient()
      .from("profiles")
      .update({ nickname: nickname.trim(), pay_link: payLink.trim() || null })
      .eq("id", userId);
    setSaving(false);
    setStatus(error ? errorMessage(error) : "저장했어요");
    if (!error) router.refresh();
  }

  return (
    <form onSubmit={save} className="mt-5 space-y-4 border-t border-zinc-100 pt-5">
      <div className="space-y-1.5">
        <label className="label" htmlFor="nickname">
          닉네임
        </label>
        <input
          id="nickname"
          className="input py-2.5"
          minLength={2}
          maxLength={12}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <label className="label" htmlFor="paylink">
          택시비 받을 곳
        </label>
        <input
          id="paylink"
          className="input py-2.5"
          maxLength={200}
          placeholder="토스 송금 링크나 계좌번호"
          value={payLink}
          onChange={(e) => setPayLink(e.target.value)}
        />
        <p className="text-[13px] text-zinc-400">방장일 때 채팅방 사람들에게 보여요.</p>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary px-5 py-2.5 text-[15px]" disabled={!dirty || saving}>
          저장
        </button>
        {status && <span className="text-sm text-zinc-500">{status}</span>}
      </div>
    </form>
  );
}
