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

  const [host, { data: messages }] = await Promise.all([
    fetchHost(supabase, ride.host_id),
    supabase
      .from("messages")
      .select("*")
      .eq("ride_id", id)
      .order("id", { ascending: false })
      .limit(200)
      .returns<Message[]>(),
  ]);

  return (
    <ChatRoom
      me={profile}
      initialRide={ride}
      initialMembers={members}
      initialMessages={(messages ?? []).reverse()}
      hostPayLink={host?.pay_link ?? null}
    />
  );
}
