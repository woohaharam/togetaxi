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
    if (error) {
      setLoading(false);
      setError(errorMessage(error));
      router.refresh();
      return;
    }
    router.push(`/rides/${rideId}/chat`);
  }

  return (
    <>
      {error && <p className="mb-2 text-center text-sm text-red-500">{error}</p>}
      <button className="btn-taxi w-full" disabled={!!blocker || loading} onClick={join}>
        {blocker ?? (loading ? "들어가는 중" : "같이 타기")}
      </button>
    </>
  );
}
