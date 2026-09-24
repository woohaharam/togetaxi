"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/format";

const SCHOOL_EMAIL = /^[^\s@]+@[^\s@]+\.(ac\.kr|edu)$/i;
const RESEND_AFTER = 60;
// Supabase 설정(Email OTP Length)에 따라 6~10자리로 온다
const CODE_MIN = 6;
const CODE_MAX = 10;

export default function LoginPage() {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (new URLSearchParams(location.search).has("expired")) {
      setError("로그인 링크가 만료됐어요. 인증번호를 다시 받아 주세요");
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendCode() {
    setError("");
    const addr = email.trim().toLowerCase();
    if (!SCHOOL_EMAIL.test(addr)) {
      setError("학교 메일 주소를 입력해 주세요 (.ac.kr, .edu)");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: addr,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) {
      setError(errorMessage(error));
      return;
    }
    setEmail(addr);
    setCode("");
    setStep("code");
    setCooldown(RESEND_AFTER);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    setLoading(false);
    if (error) {
      setError("인증번호가 맞지 않거나 시간이 지났어요");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh flex-col px-6 pt-[18vh] pb-10">
      <p className="text-[28px] leading-none font-extrabold tracking-tight">
        같이타<span className="text-taxi">.</span>
      </p>
      <h1 className="mt-6 text-[22px] leading-snug font-bold">
        같은 방향이면
        <br />
        택시비는 나눠 내요
      </h1>
      <p className="mt-2 text-[15px] text-zinc-500">학교 메일로 인증한 학생끼리만 모여요.</p>

      <div className="mt-10">
        {step === "email" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendCode();
            }}
            className="space-y-3"
          >
            <label className="label" htmlFor="email">
              학교 메일
            </label>
            <input
              id="email"
              className="input"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              placeholder="student@school.ac.kr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? "보내는 중" : "인증번호 받기"}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-3">
            <label className="label" htmlFor="code">
              {email}로 보낸 인증번호
            </label>
            <input
              id="code"
              className="input text-center text-2xl font-semibold tracking-[0.3em] tabular-nums"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={CODE_MAX}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_MAX))}
              autoFocus
              required
            />
            <p className="text-[13px] text-zinc-400">
              메일에 있는 로그인 링크를 눌러도 돼요. 스팸함도 한번 확인해 주세요.
            </p>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button className="btn-primary w-full" disabled={loading || code.length < CODE_MIN}>
              {loading ? "확인 중" : "확인"}
            </button>
            <div className="flex justify-between pt-1 text-sm text-zinc-500">
              <button type="button" onClick={() => setStep("email")}>
                메일 주소 바꾸기
              </button>
              <button type="button" disabled={cooldown > 0 || loading} onClick={sendCode} className="disabled:text-zinc-300">
                {cooldown > 0 ? `다시 받기 (${cooldown}초)` : "다시 받기"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
