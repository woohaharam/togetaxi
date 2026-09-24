"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import { BackIcon, CloseIcon, MoreIcon, SendIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { errorMessage, formatDepart, formatTime, perPerson, won } from "@/lib/format";
import { fetchMembers, fetchRide, rideState } from "@/lib/rides";
import type { Member, Message, Profile, RideStatus, RideWithUniversity } from "@/lib/types";

type Props = {
  me: Profile;
  initialRide: RideWithUniversity;
  initialMembers: Member[];
  initialMessages: Message[];
  initialNames: Record<string, string>;
  hostPayLink: string | null;
};

const STATE_TEXT = {
  open: "모집 중",
  full: "정원 마감",
  closed: "모집 마감",
  departed: "출발함",
  cancelled: "취소됨",
};

export default function ChatRoom({
  me,
  initialRide,
  initialMembers,
  initialMessages,
  initialNames,
  hostPayLink,
}: Props) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [ride, setRide] = useState(initialRide);
  const [members, setMembers] = useState(initialMembers);
  const [messages, setMessages] = useState(initialMessages);
  const [names, setNames] = useState(initialNames);
  const [text, setText] = useState("");
  const [sheet, setSheet] = useState<"none" | "menu" | "fare">("none");
  const [fare, setFare] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const isHost = ride.host_id === me.id;
  const state = rideState(ride);
  const rideId = ride.id;

  const refresh = useCallback(async () => {
    const [r, m] = await Promise.all([fetchRide(supabase, rideId), fetchMembers(supabase, rideId)]);
    if (r) setRide(r);
    setMembers(m);
    setNames((prev) => {
      const next = { ...prev };
      for (const x of m) if (x.profile) next[x.user_id] = x.profile.nickname;
      return next;
    });
    if (!m.some((x) => x.user_id === me.id)) router.replace(`/rides/${rideId}`);
  }, [supabase, rideId, me.id, router]);

  useEffect(() => {
    const channel = supabase
      .channel(`ride:${rideId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `ride_id=eq.${rideId}` },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          // 시스템 메시지는 입장·퇴장·상태 변경 때만 온다
          if (msg.user_id === null) refresh();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, rideId, refresh]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setText("");
    setError("");
    const { data, error } = await supabase
      .from("messages")
      .insert({ ride_id: rideId, user_id: me.id, content })
      .select()
      .single<Message>();
    if (error) {
      setText((current) => current || content);
      setError(errorMessage(error));
      return;
    }
    setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
  }

  async function run(fn: string, args: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setError("");
    const { error } = await supabase.rpc(fn, args);
    if (error) {
      setError(errorMessage(error));
      return;
    }
    setSheet("none");
    setFare("");
    await refresh();
  }

  const setStatus = (status: RideStatus, confirmText?: string) =>
    run("set_ride_status", { p_ride: rideId, p_status: status }, confirmText);

  const each = ride.final_fare ? perPerson(ride.final_fare, ride.member_count) : null;
  const fareNum = Number(fare) || 0;

  return (
    <div className="flex h-dvh flex-col">
      <header className="border-b border-zinc-200/80 bg-white">
        <div className="flex h-14 items-center gap-1 px-2">
          <Link href={`/rides/${rideId}`} className="grid size-10 place-items-center rounded-full active:bg-zinc-100" aria-label="뒤로">
            <BackIcon />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold">
              {ride.origin} → {ride.destination}
            </p>
            <p className="text-xs text-zinc-500">
              {formatDepart(ride.depart_at)} · {ride.member_count}/{ride.capacity}명 · {STATE_TEXT[state]}
            </p>
          </div>
          <button
            className="grid size-10 place-items-center rounded-full active:bg-zinc-100"
            onClick={() => setSheet("menu")}
            aria-label="메뉴"
          >
            <MoreIcon />
          </button>
        </div>

        {each !== null && (
          <div className="flex items-center gap-3 border-t border-zinc-100 bg-amber-50 px-4 py-2.5 text-sm">
            <p className="min-w-0 flex-1">
              1인 <b className="font-semibold">{won(each)}</b>
              {!isHost && hostPayLink && !isUrl(hostPayLink) && (
                <span className="block truncate text-[13px] text-zinc-500">{hostPayLink}</span>
              )}
            </p>
            {!isHost && hostPayLink && <PayButton value={hostPayLink} />}
            {!isHost && !hostPayLink && <span className="text-[13px] text-zinc-500">방장에게 보내 주세요</span>}
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => {
          if (m.user_id === null) {
            return (
              <p key={m.id} className="my-3 text-center text-xs text-zinc-400">
                {m.content}
              </p>
            );
          }
          const prev = messages[i - 1];
          const continued = prev?.user_id === m.user_id;
          const mine = m.user_id === me.id;
          const name = names[m.user_id] ?? "알 수 없음";

          if (mine) {
            return (
              <div key={m.id} className={`flex items-end justify-end gap-1.5 ${continued ? "mt-1" : "mt-3"}`}>
                <span className="text-[10px] text-zinc-400 tabular-nums">{formatTime(m.created_at)}</span>
                <p className="max-w-[75%] rounded-2xl rounded-br-md bg-zinc-900 px-3.5 py-2 text-[15px] break-words whitespace-pre-wrap text-white">
                  {m.content}
                </p>
              </div>
            );
          }
          return (
            <div key={m.id} className={`flex gap-2 ${continued ? "mt-1" : "mt-3"}`}>
              <div className="w-8 shrink-0">{!continued && <Avatar id={m.user_id} name={name} />}</div>
              <div className="min-w-0 flex-1">
                {!continued && <p className="mb-1 text-xs text-zinc-500">{name}</p>}
                <div className="flex items-end gap-1.5">
                  <p className="max-w-[80%] rounded-2xl rounded-tl-md bg-white px-3.5 py-2 text-[15px] break-words whitespace-pre-wrap">
                    {m.content}
                  </p>
                  <span className="text-[10px] text-zinc-400 tabular-nums">{formatTime(m.created_at)}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </main>

      {error && <p className="bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
      <form
        onSubmit={send}
        className="flex items-center gap-2 border-t border-zinc-200/80 bg-white px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        <input
          className="input rounded-full border-transparent bg-zinc-100 py-2.5 focus:border-transparent"
          placeholder="메시지 입력"
          maxLength={500}
          value={text}
          onChange={(e) => setText(e.target.value)}
          enterKeyHint="send"
        />
        <button
          className="grid size-10 shrink-0 place-items-center rounded-full bg-zinc-900 text-white transition disabled:bg-zinc-200"
          disabled={!text.trim()}
          aria-label="보내기"
        >
          <SendIcon size={20} strokeWidth={2.2} />
        </button>
      </form>

      {sheet !== "none" && (
        <div className="fixed inset-0 z-30 mx-auto flex max-w-md flex-col justify-end bg-black/30" onClick={() => setSheet("none")}>
          <div
            className="rounded-t-3xl bg-white px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[17px] font-semibold">{sheet === "fare" ? "택시비 나누기" : "참여자"}</h2>
              <button className="grid size-10 place-items-center" onClick={() => setSheet("none")} aria-label="닫기">
                <CloseIcon />
              </button>
            </div>

            {sheet === "menu" ? (
              <>
                <ul className="space-y-3 pb-5">
                  {members.map((m) => (
                    <li key={m.user_id} className="flex items-center gap-2.5">
                      <Avatar id={m.user_id} name={m.profile?.nickname ?? "?"} />
                      <span className="font-medium">{m.profile?.nickname}</span>
                      {m.user_id === ride.host_id && <span className="text-[13px] text-zinc-400">방장</span>}
                      {isHost && m.user_id !== me.id && ride.status !== "cancelled" && (
                        <button
                          className="ml-auto text-[13px] text-zinc-400"
                          onClick={() =>
                            run(
                              "kick_member",
                              { p_ride: rideId, p_user: m.user_id },
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

                {ride.status !== "cancelled" && (
                  <div className="space-y-2 border-t border-zinc-100 pt-4">
                    {isHost ? (
                      <>
                        <button className="btn-primary w-full" onClick={() => setSheet("fare")}>
                          택시비 나누기
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                          {ride.status === "open" ? (
                            <button className="btn-ghost" onClick={() => setStatus("closed")}>
                              모집 마감
                            </button>
                          ) : (
                            <button className="btn-ghost" onClick={() => setStatus("open")}>
                              다시 모집
                            </button>
                          )}
                          <button
                            className="btn-ghost text-red-500"
                            onClick={() => setStatus("cancelled", "모집을 취소할까요? 되돌릴 수 없어요.")}
                          >
                            모집 취소
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        className="btn-ghost w-full text-red-500"
                        onClick={() => run("leave_ride", { p_ride: rideId }, "채팅방에서 나갈까요?")}
                      >
                        나가기
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <form
                className="space-y-3 pb-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  run("set_final_fare", { p_ride: rideId, p_fare: fareNum });
                }}
              >
                <p className="text-sm text-zinc-500">실제로 나온 요금을 적으면 채팅방에 1인 금액을 알려 줘요.</p>
                <div className="relative">
                  <input
                    className="input pr-10 text-lg"
                    inputMode="numeric"
                    placeholder="15,800"
                    value={fare ? fareNum.toLocaleString("ko-KR") : ""}
                    onChange={(e) => setFare(e.target.value.replace(/\D/g, "").slice(0, 7))}
                    autoFocus
                  />
                  <span className="absolute top-1/2 right-4 -translate-y-1/2 text-zinc-400">원</span>
                </div>
                <p className="h-5 text-sm text-zinc-600">
                  {fareNum > 0 && `${ride.member_count}명 · 1인 ${won(perPerson(fareNum, ride.member_count))}`}
                </p>
                <button className="btn-primary w-full" disabled={!fareNum}>
                  알리기
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function isUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function PayButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const cls = "shrink-0 rounded-lg bg-zinc-900 px-3 py-1.5 text-[13px] font-semibold text-white";

  if (isUrl(value)) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" className={cls}>
        송금하기
      </a>
    );
  }
  return (
    <button
      className={cls}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? "복사됨" : "계좌 복사"}
    </button>
  );
}
