"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { errorMessage, formatDepart, formatTime, perPerson, won } from "@/lib/format";
import { fetchMembers, fetchRide } from "@/lib/rides";
import type { Member, Message, Profile, RideStatus, RideWithUniversity } from "@/lib/types";

type Props = {
  me: Profile;
  initialRide: RideWithUniversity;
  initialMembers: Member[];
  initialMessages: Message[];
  hostPayLink: string | null;
};

export default function ChatRoom({
  me,
  initialRide,
  initialMembers,
  initialMessages,
  hostPayLink,
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [ride, setRide] = useState(initialRide);
  const [members, setMembers] = useState(initialMembers);
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [panel, setPanel] = useState<"none" | "menu" | "fare">("none");
  const [fare, setFare] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const isHost = ride.host_id === me.id;
  const nameOf = useCallback(
    (userId: string | null) =>
      members.find((m) => m.user_id === userId)?.profile?.nickname ?? "나간 사용자",
    [members],
  );

  const refresh = useCallback(async () => {
    const [r, m] = await Promise.all([fetchRide(supabase, ride.id), fetchMembers(supabase, ride.id)]);
    if (r) setRide(r);
    setMembers(m);
    if (!m.some((x) => x.user_id === me.id)) router.replace(`/rides/${ride.id}`);
  }, [supabase, ride.id, me.id, router]);

  useEffect(() => {
    const channel = supabase
      .channel(`ride:${ride.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `ride_id=eq.${ride.id}` },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          // 시스템 메시지 = 참여/퇴장/상태 변경 → 공고 정보 새로고침
          if (msg.user_id === null) refresh();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, ride.id, refresh]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    const { data, error } = await supabase
      .from("messages")
      .insert({ ride_id: ride.id, user_id: me.id, content })
      .select()
      .single<Message>();
    setSending(false);
    if (error) return setError(errorMessage(error));
    setText("");
    setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
  }

  async function rpc(fn: string, args: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    setError("");
    const { error } = await supabase.rpc(fn, args);
    if (error) return setError(errorMessage(error));
    setPanel("none");
    await refresh();
  }

  const setStatus = (status: RideStatus, confirmText?: string) =>
    rpc("set_ride_status", { p_ride: ride.id, p_status: status }, confirmText);

  const each = ride.final_fare ? perPerson(ride.final_fare, ride.member_count) : null;

  return (
    <div className="flex h-dvh flex-col">
      <header className="border-b border-zinc-200 bg-white">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href={`/rides/${ride.id}`} className="text-2xl leading-none">
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">
              {ride.origin} → {ride.destination}
            </p>
            <p className="text-xs text-zinc-500">
              {formatDepart(ride.depart_at)} · {ride.member_count}/{ride.capacity}명 ·{" "}
              {ride.status === "cancelled" ? "취소됨" : ride.status === "closed" ? "모집마감" : "모집중"}
            </p>
          </div>
          <button
            className="rounded-lg px-2 py-1 text-xl"
            onClick={() => setPanel(panel === "menu" ? "none" : "menu")}
            aria-label="메뉴"
          >
            ☰
          </button>
        </div>

        {panel === "menu" && (
          <div className="space-y-3 border-t border-zinc-100 px-4 py-3">
            <div>
              <p className="mb-2 text-xs font-semibold text-zinc-400">참여자</p>
              <ul className="space-y-1.5">
                {members.map((m) => (
                  <li key={m.user_id} className="flex items-center gap-2 text-sm">
                    <span>{m.profile?.gender === "female" ? "👩" : "👨"}</span>
                    <span className="font-medium">{m.profile?.nickname}</span>
                    {m.user_id === ride.host_id && (
                      <span className="rounded bg-taxi px-1.5 text-xs font-semibold">방장</span>
                    )}
                    {isHost && m.user_id !== me.id && ride.status !== "cancelled" && (
                      <button
                        className="ml-auto text-xs text-red-500"
                        onClick={() =>
                          rpc(
                            "kick_member",
                            { p_ride: ride.id, p_user: m.user_id },
                            `${m.profile?.nickname}님을 내보낼까요?`,
                          )
                        }
                      >
                        내보내기
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {ride.status !== "cancelled" && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                {isHost ? (
                  <>
                    {ride.status === "open" ? (
                      <button className="btn-ghost py-2 text-sm" onClick={() => setStatus("closed")}>
                        모집 마감
                      </button>
                    ) : (
                      <button className="btn-ghost py-2 text-sm" onClick={() => setStatus("open")}>
                        다시 모집
                      </button>
                    )}
                    <button className="btn-ghost py-2 text-sm" onClick={() => setPanel("fare")}>
                      💸 요금 정산
                    </button>
                    <button
                      className="btn-ghost col-span-2 py-2 text-sm text-red-500"
                      onClick={() => setStatus("cancelled", "공고를 취소할까요? 되돌릴 수 없어요.")}
                    >
                      공고 취소
                    </button>
                  </>
                ) : (
                  <button
                    className="btn-ghost col-span-2 py-2 text-sm text-red-500"
                    onClick={() => rpc("leave_ride", { p_ride: ride.id }, "채팅방을 나갈까요?")}
                  >
                    나가기
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {panel === "fare" && (
          <form
            className="space-y-2 border-t border-zinc-100 px-4 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              rpc("set_final_fare", { p_ride: ride.id, p_fare: Number(fare) });
            }}
          >
            <p className="text-sm font-semibold">실제 나온 택시비를 입력하세요</p>
            <div className="flex gap-2">
              <input
                className="input py-2"
                inputMode="numeric"
                placeholder="예: 15800"
                value={fare}
                onChange={(e) => setFare(e.target.value.replace(/\D/g, "").slice(0, 7))}
                autoFocus
              />
              <button className="btn-primary shrink-0 py-2" disabled={!fare}>
                알리기
              </button>
            </div>
            {Number(fare) > 0 && (
              <p className="text-xs text-zinc-500">
                {ride.member_count}명 · 1인당 {won(perPerson(Number(fare), ride.member_count))} (100원 단위 올림)
              </p>
            )}
          </form>
        )}

        {each !== null && (
          <div className="flex items-center justify-between gap-2 bg-taxi/30 px-4 py-2 text-sm">
            <span>
              💸 1인당 <b>{won(each)}</b>
              {!isHost && " → 방장에게 보내주세요"}
            </span>
            {!isHost && hostPayLink && (
              <PayLink value={hostPayLink} />
            )}
          </div>
        )}
      </header>

      <main className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {messages.map((m) =>
          m.user_id === null ? (
            <p key={m.id} className="mx-auto w-fit rounded-full bg-zinc-200/70 px-3 py-1 text-center text-xs text-zinc-600">
              {m.content}
            </p>
          ) : m.user_id === me.id ? (
            <div key={m.id} className="flex items-end justify-end gap-1.5">
              <span className="text-[10px] text-zinc-400">{formatTime(m.created_at)}</span>
              <p className="max-w-[75%] rounded-2xl rounded-br-sm bg-taxi px-3 py-2 break-words whitespace-pre-wrap">
                {m.content}
              </p>
            </div>
          ) : (
            <div key={m.id}>
              <p className="mb-0.5 text-xs text-zinc-500">{nameOf(m.user_id)}</p>
              <div className="flex items-end gap-1.5">
                <p className="max-w-[75%] rounded-2xl rounded-bl-sm bg-white px-3 py-2 break-words whitespace-pre-wrap shadow-sm">
                  {m.content}
                </p>
                <span className="text-[10px] text-zinc-400">{formatTime(m.created_at)}</span>
              </div>
            </div>
          ),
        )}
        <div ref={bottomRef} />
      </main>

      {error && <p className="bg-red-50 px-4 py-2 text-sm text-red-500">{error}</p>}
      <form
        onSubmit={send}
        className="flex gap-2 border-t border-zinc-200 bg-white px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        <input
          className="input py-2.5"
          placeholder="메시지 보내기"
          maxLength={500}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn-primary shrink-0 px-4 py-2" disabled={!text.trim() || sending}>
          전송
        </button>
      </form>
    </div>
  );
}

function PayLink({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  if (/^https?:\/\//.test(value)) {
    return (
      <a href={value} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg bg-zinc-900 px-3 py-1 text-xs font-semibold text-white">
        송금하기
      </a>
    );
  }
  return (
    <button
      className="shrink-0 rounded-lg bg-zinc-900 px-3 py-1 text-xs font-semibold text-white"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
      }}
      title={value}
    >
      {copied ? "복사됨" : "계좌 복사"}
    </button>
  );
}
