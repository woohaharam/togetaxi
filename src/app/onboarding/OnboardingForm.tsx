"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { errorMessage, universityLabel } from "@/lib/format";
import { REGIONS } from "@/lib/regions";
import type { Gender, University } from "@/lib/types";

function matchesDomain(u: University, emailDomain: string) {
  return (u.domains ?? []).some((d) => emailDomain === d || emailDomain.endsWith(`.${d}`));
}

const normalize = (s: string) => s.replace(/\s/g, "").toLowerCase();

export default function OnboardingForm({
  userId,
  email,
  universities: initial,
}: {
  userId: string;
  email: string;
  universities: University[];
}) {
  const router = useRouter();
  const [universities, setUniversities] = useState(initial);
  const emailDomain = email.split("@")[1]?.toLowerCase() ?? "";
  const suggested = useMemo(
    () => universities.filter((u) => matchesDomain(u, emailDomain)),
    [universities, emailDomain],
  );

  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [universityId, setUniversityId] = useState<number | null>(
    suggested.length === 1 ? suggested[0].id : null,
  );
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", campus: "", region: "" });
  const [agreed, setAgreed] = useState({ age: false, terms: false, privacy: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const allAgreed = agreed.age && agreed.terms && agreed.privacy;
  const selected = universities.find((u) => u.id === universityId) ?? null;
  const results = useMemo(() => {
    const q = normalize(query);
    if (!q) return suggested;
    return universities.filter((u) => normalize(universityLabel(u)).includes(q)).slice(0, 20);
  }, [query, universities, suggested]);

  async function addUniversity() {
    setError("");
    if (draft.name.trim().length < 2 || !draft.region) {
      setError("학교 이름과 지역을 알려주세요");
      return;
    }
    setLoading(true);
    const { data, error } = await createClient()
      .from("universities")
      .insert({ name: draft.name.trim(), campus: draft.campus.trim(), region: draft.region, created_by: userId })
      .select("id, name, campus, region, kind, domains")
      .single<University>();
    setLoading(false);
    if (error) {
      setError(errorMessage(error));
      return;
    }
    setUniversities((prev) => [...prev, data]);
    setUniversityId(data.id);
    setAdding(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!gender) return setError("성별을 골라 주세요");
    if (!universityId) return setError("학교를 골라 주세요");
    if (!allAgreed) return setError("필수 항목에 모두 동의해 주세요");
    setLoading(true);
    const { error } = await createClient()
      .from("profiles")
      .insert({ id: userId, nickname: nickname.trim(), gender, university_id: universityId });
    setLoading(false);
    if (error) return setError(errorMessage(error));
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="px-5 pt-12 pb-10">
      <h1 className="text-[22px] font-bold">처음 오셨네요</h1>
      <p className="mt-1 text-[15px] text-zinc-500">같이 탈 사람들에게 보이는 정보예요.</p>

      <form onSubmit={submit} className="mt-8 space-y-7">
        <div className="space-y-2">
          <label className="label" htmlFor="nickname">
            닉네임
          </label>
          <input
            id="nickname"
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
          <span className="label">성별</span>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["female", "여자"],
                ["male", "남자"],
              ] as const
            ).map(([value, text]) => (
              <button
                type="button"
                key={value}
                className="chip rounded-xl py-3 text-base"
                data-active={gender === value}
                onClick={() => setGender(value)}
              >
                {text}
              </button>
            ))}
          </div>
          <p className="text-[13px] text-zinc-500">동성끼리 타기 옵션에 쓰여요. 나중에 바꿀 수 없어요.</p>
        </div>

        <div className="space-y-2">
          <span className="label">학교</span>
          {selected ? (
            <div className="flex items-center justify-between rounded-xl border border-zinc-900 bg-white px-4 py-3">
              <span className="font-semibold">{universityLabel(selected)}</span>
              <button type="button" className="text-sm text-zinc-500" onClick={() => setUniversityId(null)}>
                바꾸기
              </button>
            </div>
          ) : adding ? (
            <div className="space-y-2 rounded-xl border border-zinc-200 bg-white p-3">
              <input
                className="input"
                placeholder="학교 이름"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
              <input
                className="input"
                placeholder="캠퍼스 (없으면 비워 두기)"
                value={draft.campus}
                onChange={(e) => setDraft({ ...draft, campus: e.target.value })}
              />
              <select
                className="input"
                value={draft.region}
                onChange={(e) => setDraft({ ...draft, region: e.target.value })}
              >
                <option value="">지역</option>
                {REGIONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
              <div className="flex gap-2 pt-1">
                <button type="button" className="btn-ghost flex-1 py-3" onClick={() => setAdding(false)}>
                  취소
                </button>
                <button type="button" className="btn-primary flex-1 py-3" disabled={loading} onClick={addUniversity}>
                  추가
                </button>
              </div>
            </div>
          ) : (
            <>
              <input
                className="input"
                placeholder="학교 이름으로 찾기"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {!query && suggested.length > 0 && (
                <p className="px-1 pt-1 text-[13px] text-zinc-500">@{emailDomain} 메일을 쓰는 학교</p>
              )}
              {results.length > 0 && (
                <ul className="max-h-72 divide-y divide-zinc-100 overflow-y-auto rounded-xl border border-zinc-200 bg-white">
                  {results.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between px-4 py-3 text-left active:bg-zinc-50"
                        onClick={() => setUniversityId(u.id)}
                      >
                        <span>{universityLabel(u)}</span>
                        <span className="text-[13px] text-zinc-500">{u.region}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {query && results.length === 0 && (
                <p className="px-1 text-sm text-zinc-500">검색 결과가 없어요.</p>
              )}
              <button
                type="button"
                className="px-1 text-sm text-zinc-500 underline underline-offset-2"
                onClick={() => {
                  setAdding(true);
                  setDraft({ name: query.trim(), campus: "", region: "" });
                }}
              >
                우리 학교가 없어요
              </button>
            </>
          )}
        </div>

        <section className="space-y-1 rounded-xl border border-zinc-200 bg-white p-1">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 font-semibold">
            <input
              type="checkbox"
              className="size-5 shrink-0 accent-zinc-900"
              checked={allAgreed}
              onChange={(e) => {
                const v = e.target.checked;
                setAgreed({ age: v, terms: v, privacy: v });
              }}
            />
            모두 동의해요
          </label>
          <div className="border-t border-zinc-100" />
          {(
            [
              ["age", "만 14세 이상이에요", null],
              ["terms", "이용약관에 동의해요", "/terms"],
              ["privacy", "개인정보 수집·이용에 동의해요", "/privacy"],
            ] as const
          ).map(([key, text, href]) => (
            <label key={key} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[15px]">
              <input
                type="checkbox"
                className="size-5 shrink-0 accent-zinc-900"
                checked={agreed[key]}
                onChange={(e) => setAgreed({ ...agreed, [key]: e.target.checked })}
              />
              <span className="flex-1">
                <span className="text-zinc-500">[필수]</span> {text}
              </span>
              {href && (
                <Link
                  href={href}
                  target="_blank"
                  className="shrink-0 px-1 text-[13px] text-zinc-500 underline underline-offset-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  보기
                </Link>
              )}
            </label>
          ))}
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-taxi w-full" disabled={loading || !allAgreed}>
          시작하기
        </button>
      </form>
    </main>
  );
}
