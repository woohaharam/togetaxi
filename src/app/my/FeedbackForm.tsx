"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/format";

export default function FeedbackForm({ userId }: { userId: string }) {
  const [content, setContent] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError("");
    const { error } = await createClient()
      .from("feedback")
      .insert({ user_id: userId, content: content.trim() });
    if (error) {
      setState("idle");
      setError(errorMessage(error));
      return;
    }
    setContent("");
    setState("done");
  }

  return (
    <form onSubmit={submit} className="space-y-2.5">
      <textarea
        className="input min-h-24 resize-none text-[15px]"
        maxLength={1000}
        placeholder="불편한 점, 있었으면 하는 기능, 버그 뭐든 좋아요"
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          if (state === "done") setState("idle");
        }}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex items-center gap-3">
        <button className="btn-primary px-5 py-2.5 text-[15px]" disabled={!content.trim() || state === "sending"}>
          보내기
        </button>
        {state === "done" && <span className="text-sm text-zinc-500">고마워요, 꼭 읽어볼게요</span>}
      </div>
    </form>
  );
}
