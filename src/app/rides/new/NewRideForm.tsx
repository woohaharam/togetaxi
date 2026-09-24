"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { errorMessage, kstLocalToIso, nowKstLocal, perPerson, won } from "@/lib/format";
import type { Gender } from "@/lib/types";

function PlaceField({
  label,
  value,
  onChange,
  places,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  places: string[];
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-600">{label}</label>
      <input
        className="input"
        maxLength={40}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />
      {places.length > 0 && (
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
          {places.map((p) => (
            <button
              type="button"
              key={p}
              className="chip shrink-0 py-1 text-xs"
              data-active={value === p}
              onClick={() => onChange(p)}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NewRideForm({ places, gender }: { places: string[]; gender: Gender }) {
  const router = useRouter();
  const supabase = createClient();
  const [origin, setOrigin] = useState(places[0] ?? "");
  const [destination, setDestination] = useState("");
  const [departAt, setDepartAt] = useState(nowKstLocal(30));
  const [capacity, setCapacity] = useState(4);
  const [sameGender, setSameGender] = useState(false);
  const [fare, setFare] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fareNum = Number(fare) || 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (origin.trim() === destination.trim()) return setError("출발지와 도착지가 같아요");
    setLoading(true);
    const { data, error } = await supabase.rpc("create_ride", {
      p_origin: origin,
      p_destination: destination,
      p_depart_at: kstLocalToIso(departAt),
      p_capacity: capacity,
      p_same_gender_only: sameGender,
      p_estimated_fare: fareNum || null,
      p_note: note,
    });
    setLoading(false);
    if (error) return setError(errorMessage(error));
    router.replace(`/rides/${data}/chat`);
  }

  return (
    <main className="px-4 pb-10">
      <header className="flex items-center gap-3 py-4">
        <Link href="/" className="text-2xl leading-none">
          ←
        </Link>
        <h1 className="text-lg font-bold">택시 같이 탈 사람 구해요</h1>
      </header>

      <form onSubmit={submit} className="space-y-6">
        <PlaceField
          label="출발"
          value={origin}
          onChange={setOrigin}
          places={places}
          placeholder="예: 정문 앞"
        />
        <button
          type="button"
          className="mx-auto -my-3 block text-sm text-zinc-500"
          onClick={() => {
            setOrigin(destination);
            setDestination(origin);
          }}
        >
          ⇅ 출발/도착 바꾸기
        </button>
        <PlaceField
          label="도착"
          value={destination}
          onChange={setDestination}
          places={places}
          placeholder="예: 신경주역"
        />

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-600">출발 시간</label>
          <input
            className="input"
            type="datetime-local"
            min={nowKstLocal()}
            max={nowKstLocal(30 * 24 * 60)}
            value={departAt}
            onChange={(e) => setDepartAt(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-600">총 인원 (나 포함)</label>
          <div className="grid grid-cols-3 gap-2">
            {[2, 3, 4].map((n) => (
              <button
                type="button"
                key={n}
                className="chip py-2.5 text-base"
                data-active={capacity === n}
                onClick={() => setCapacity(n)}
              >
                {n}명
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between rounded-xl bg-white px-4 py-3">
          <span>
            <span className="font-medium">{gender === "female" ? "여성" : "남성"}만 참여 가능</span>
            <span className="block text-xs text-zinc-400">동성끼리만 탈 수 있게 제한해요</span>
          </span>
          <input
            type="checkbox"
            className="size-5 accent-zinc-900"
            checked={sameGender}
            onChange={(e) => setSameGender(e.target.checked)}
          />
        </label>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-600">예상 택시비 (선택)</label>
          <input
            className="input"
            inputMode="numeric"
            placeholder="예: 16000"
            value={fare}
            onChange={(e) => setFare(e.target.value.replace(/\D/g, "").slice(0, 7))}
          />
          {fareNum > 0 && (
            <p className="text-sm text-zinc-500">
              {capacity}명이 타면 1인당 약{" "}
              <b className="text-zinc-900">{won(perPerson(fareNum, capacity))}</b>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-600">한마디 (선택)</label>
          <textarea
            className="input min-h-20 resize-none"
            maxLength={200}
            placeholder="예: 정문 편의점 앞에서 만나요. 캐리어 있어요!"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        <button className="btn-taxi w-full" disabled={loading}>
          {loading ? "올리는 중…" : "공고 올리기"}
        </button>
      </form>
    </main>
  );
}
