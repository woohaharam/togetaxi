import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { fetchHost, fetchMembers, fetchRide } from "@/lib/rides";
import type { Message } from "@/lib/types";
import ChatRoom from "./ChatRoom";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();
  const ride = await fetchRide(supabase, id);
  if (!ride) notFound();

  const members = await fetchMembers(supabase, id);
  if (!members.some((m) => m.user_id === profile.id)) redirect(`/rides/${id}`);

  const [host, { data: recent }, { data: blocks }] = await Promise.all([
    fetchHost(supabase, ride.host_id),
    supabase
      .from("messages")
      .select("*")
      .eq("ride_id", id)
      .order("id", { ascending: false })
      .limit(200)
      .returns<Message[]>(),
    supabase.from("blocks").select("blocked_id").eq("blocker_id", profile.id),
  ]);
  const messages = (recent ?? []).reverse();

  // 나간 사람이 남긴 메시지에도 이름을 붙이기 위해
  const names: Record<string, string> = {};
  for (const m of members) if (m.profile) names[m.user_id] = m.profile.nickname;
  const missing = [...new Set(messages.map((m) => m.user_id))].filter(
    (uid): uid is string => !!uid && !names[uid],
  );
  if (missing.length) {
    const { data } = await supabase.from("profiles").select("id, nickname").in("id", missing);
    for (const p of data ?? []) names[p.id] = p.nickname;
  }

  return (
    <ChatRoom
      me={profile}
      initialRide={ride}
      initialMembers={members}
      initialMessages={messages}
      initialNames={names}
      initialBlocked={(blocks ?? []).map((b) => b.blocked_id)}
      hostPayLink={host?.pay_link ?? null}
    />
  );
}
