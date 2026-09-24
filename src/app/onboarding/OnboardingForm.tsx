"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { errorMessage, universityLabel } from "@/lib/format";
import type { Gender, University } from "@/lib/types";

const REGIONS = [
  "서울", "경기", "인천", "강원", "충북", "충남", "대전", "세종",
  "전북", "전남", "광주", "경북", "경남", "대구", "부산", "울산", "제주",
];

export default function OnboardingForm({
  userId,
  universities: initial,
}: {
  userId: string;
  universities: University[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [universities, setUniversities] = useState(initial);
  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [query, setQuery] = useState("");
  const [universityId, setUniversityId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [newUniv, setNewUniv] = useState({ name: "", campus: "", region: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selected = universities.find((u) => u.id === universityId) ?? null;
  const matches = useMemo(() => {
    const q = query.replace(/\s/g, "");
    if (!q) return [];
    return universities
      .filter((u) => universityLabel(u).replace(/\s/g, "").includes(q))
      .slice(0, 8);
  }, [query, universities]);

  async function addUniversity() {
    setError("");
    if (newUniv.name.trim().length < 2 || !newUniv.region) {
      return setError("학교 이름과 지역을 입력해 주세요");
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("universities")
      .insert({
        name: newUniv.name.trim(),
        campus: newUniv.campus.trim(),
        region: newUniv.region,
        created_by: userId,
      })
      .select("id, name, campus, region")
      .single<University>();
    setLoading(false);
    if (error) return setError(errorMessage(error));
    setUniversities((prev) => [...prev, data]);
    setUniversityId(data.id);
    setAdding(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!gender || !universityId) return setError("모든 항목을 입력해 주세요");
    setLoading(true);
    const { error } = await supabase.from("profiles").insert({
      id: userId,
      nickname: nickname.trim(),
      gender,
      university_id: universityId,
    });
    setLoading(false);
    if (error) return setError(errorMessage(error));
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="px-6 py-10">
      <h1 className="text-2xl font-bold">반가워요! 👋</h1>
      <p className="mt-1 text-zinc-500">같이 탈 학우들에게 보여질 정보를 알려주세요</p>

      <form onSubmit={submit} className="mt-8 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-600">닉네임</label>
          <input
            className="input"
            placeholder="2~12자"
            minLength={2}
            maxLength={12}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-600">성별</label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["male", "남성"],
                ["female", "여성"],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                key={value}
                className="chip py-3 text-base"
                data-active={gender === value}
                onClick={() => setGender(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-400">
            &lsquo;동성끼리 타기&rsquo; 옵션에 쓰여요. 가입 후에는 바꿀 수 없어요.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-600">학교 · 캠퍼스</label>
          {selected ? (
            <div className="flex items-center justify-between rounded-xl border border-zinc-900 bg-white px-4 py-3">
              <span className="font-medium">{universityLabel(selected)}</span>
              <button
                type="button"
                className="text-sm text-zinc-500"
                onClick={() => {
                  setUniversityId(null);
                  setQuery("");
                }}
              >
                변경
              </button>
            </div>
          ) : adding ? (
            <div className="card space-y-2">
              <input
                className="input"
                placeholder="학교 이름 (예: 동국대학교)"
                value={newUniv.name}
                onChange={(e) => setNewUniv({ ...newUniv, name: e.target.value })}
              />
              <input
                className="input"
                placeholder="캠퍼스 (없으면 비워두세요)"
                value={newUniv.campus}
                onChange={(e) => setNewUniv({ ...newUniv, campus: e.target.value })}
              />
              <select
                className="input"
                value={newUniv.region}
                onChange={(e) => setNewUniv({ ...newUniv, region: e.target.value })}
              >
                <option value="">지역 선택</option>
                {REGIONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button type="button" className="btn-ghost flex-1" onClick={() => setAdding(false)}>
                  취소
                </button>
                <button
                  type="button"
                  className="btn-primary flex-1"
                  disabled={loading}
                  onClick={addUniversity}
                >
                  추가
                </button>
              </div>
            </div>
          ) : (
            <>
              <input
                className="input"
                placeholder="학교 이름 검색"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {matches.length > 0 && (
                <ul className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                  {matches.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        className="flex w-full justify-between px-4 py-3 text-left hover:bg-zinc-50"
                        onClick={() => setUniversityId(u.id)}
                      >
                        <span>{universityLabel(u)}</span>
                        <span className="text-sm text-zinc-400">{u.region}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                className="text-sm text-zinc-500 underline"
                onClick={() => {
                  setAdding(true);
                  setNewUniv({ name: query.trim(), campus: "", region: "" });
                }}
              >
                찾는 학교가 없나요? 직접 추가하기
              </button>
            </>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        <button className="btn-taxi w-full" disabled={loading}>
          시작하기
        </button>
      </form>
    </main>
  );
}
