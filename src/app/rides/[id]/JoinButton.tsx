"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/format";

export default function JoinButton({ rideId, blocker }: { rideId: string; blocker: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function join() {
    setError("");
    setLoading(true);
    const { error } = await createClient().rpc("join_ride", { p_ride: rideId });
    setLoading(false);
    if (error) {
      setError(errorMessage(error));
      router.refresh();
      return;
    }
    router.push(`/rides/${rideId}/chat`);
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-center text-sm text-red-500">{error}</p>}
      <button className="btn-taxi w-full" disabled={!!blocker || loading} onClick={join}>
        {blocker ?? (loading ? "참여하는 중…" : "🚕 같이 타기")}
      </button>
    </div>
  );
}
