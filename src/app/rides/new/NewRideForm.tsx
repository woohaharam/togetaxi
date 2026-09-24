"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { SwapIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { errorMessage, kstLocalFromNow, kstLocalToIso, perPerson, won } from "@/lib/format";
import type { Gender } from "@/lib/types";

function PlaceInput({
  id,
  value,
  onChange,
  places,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  places: string[];
  placeholder: string;
}) {
  return (
    <>
      <input
        id={id}
        className="input"
        maxLength={40}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />
      {places.length > 0 && (
        <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pt-2 [scrollbar-width:none]">
          {places.map((p) => (
            <button
              type="button"
              key={p}
              className="chip shrink-0 px-3 py-1 text-[13px]"
              data-active={value === p}
              onClick={() => onChange(p)}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export default function NewRideForm({ places, gender }: { places: string[]; gender: Gender }) {
  const router = useRouter();
  const [origin, setOrigin] = useState(places[0] ?? "");
  const [destination, setDestination] = useState("");
  const [departAt, setDepartAt] = useState(() => kstLocalFromNow(30));
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
    if (origin.trim() === destination.trim()) {
      setError("출발지와 도착지가 같아요");
      return;
    }
    setLoading(true);
    const { data, error } = await createClient().rpc("create_ride", {
      p_origin: origin,
      p_destination: destination,
      p_depart_at: kstLocalToIso(departAt),
      p_capacity: capacity,
      p_same_gender_only: sameGender,
      p_estimated_fare: fareNum || null,
      p_note: note,
    });
    if (error) {
      setLoading(false);
      setError(errorMessage(error));
      return;
    }
    router.replace(`/rides/${data}/chat`);
  }

  return (
    <>
      <PageHeader title="모집하기" />
      <form onSubmit={submit} className="space-y-7 px-5 pt-2 pb-10">
        <section>
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="origin">
              출발
            </label>
            <button
              type="button"
              className="flex items-center gap-1 text-[13px] text-zinc-500"
              onClick={() => {
                setOrigin(destination);
                setDestination(origin);
              }}
            >
              <SwapIcon size={15} />
              출발·도착 바꾸기
            </button>
          </div>
          <div className="mt-2">
            <PlaceInput id="origin" value={origin} onChange={setOrigin} places={places} placeholder="어디서 타나요?" />
          </div>
          <label className="label mt-5" htmlFor="destination">
            도착
          </label>
          <div className="mt-2">
            <PlaceInput
              id="destination"
              value={destination}
              onChange={setDestination}
              places={places}
              placeholder="어디로 가나요?"
            />
          </div>
        </section>

        <section className="space-y-2">
          <label className="label" htmlFor="depart">
            출발 시간
          </label>
          <input
            id="depart"
            className="input"
            type="datetime-local"
            min={kstLocalFromNow()}
            max={kstLocalFromNow(30 * 24 * 60)}
            step={600}
            value={departAt}
            onChange={(e) => setDepartAt(e.target.value)}
            required
          />
        </section>

        <section className="space-y-2">
          <span className="label">몇 명이서 탈까요? (나 포함)</span>
          <div className="grid grid-cols-3 gap-2">
            {[2, 3, 4].map((n) => (
              <button
                type="button"
                key={n}
                className="chip rounded-xl py-2.5 text-base"
                data-active={capacity === n}
                onClick={() => setCapacity(n)}
              >
                {n}명
              </button>
            ))}
          </div>
        </section>

        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-white px-4 py-3.5">
          <span>
            <span className="block font-medium">{gender === "female" ? "여자" : "남자"}끼리만 타기</span>
            <span className="block text-[13px] text-zinc-400">다른 성별은 참여할 수 없어요</span>
          </span>
          <input
            type="checkbox"
            className="size-5 shrink-0 accent-zinc-900"
            checked={sameGender}
            onChange={(e) => setSameGender(e.target.checked)}
          />
        </label>

        <section className="space-y-2">
          <label className="label" htmlFor="fare">
            예상 택시비 <span className="font-normal text-zinc-400">(선택)</span>
          </label>
          <div className="relative">
            <input
              id="fare"
              className="input pr-10"
              inputMode="numeric"
              placeholder="16,000"
              value={fare ? Number(fare).toLocaleString("ko-KR") : ""}
              onChange={(e) => setFare(e.target.value.replace(/\D/g, "").slice(0, 7))}
            />
            <span className="absolute top-1/2 right-4 -translate-y-1/2 text-zinc-400">원</span>
          </div>
          {fareNum > 0 && (
            <p className="text-sm text-zinc-500">
              {capacity}명이 다 모이면 1인 <b className="font-semibold text-zinc-900">{won(perPerson(fareNum, capacity))}</b>
            </p>
          )}
        </section>

        <section className="space-y-2">
          <label className="label" htmlFor="note">
            하고 싶은 말 <span className="font-normal text-zinc-400">(선택)</span>
          </label>
          <textarea
            id="note"
            className="input min-h-24 resize-none"
            maxLength={200}
            placeholder="만날 곳, 짐 여부 같은 걸 적어 두면 좋아요"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </section>

        {error && <p className="text-sm text-red-500">{error}</p>}
        <button className="btn-taxi w-full" disabled={loading}>
          {loading ? "올리는 중" : "모집 열기"}
        </button>
      </form>
    </>
  );
}
