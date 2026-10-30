"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/format";

const SCHOOL_EMAIL = /^[^\s@]+@[^\s@]+\.(ac\.kr|edu)$/i;
const RESEND_AFTER = 60;
const MIN_PASSWORD = 8;
// Supabase 설정(Email OTP Length)에 따라 6~10자리로 온다
const CODE_MIN = 6;
const CODE_MAX = 10;

type Step = "signin" | "email" | "code" | "password";
/** 인증번호를 거쳐 비밀번호를 정하는 이유 (문구만 달라진다) */
type Intent = "signup" | "reset";

export default function LoginPage() {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [step, setStep] = useState<Step>("signin");
  const [intent, setIntent] = useState<Intent>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (new URLSearchParams(location.search).has("expired")) {
      setError("로그인 링크가 만료됐어요. 다시 시도해 주세요");
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function go(next: Step, nextIntent?: Intent) {
    setError("");
    setHint(false);
    setCode("");
    setPassword("");
    if (nextIntent) setIntent(nextIntent);
    setStep(next);
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setHint(false);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (error) {
      // 비밀번호가 생기기 전에 가입한 사람도 여기로 온다
      setError("메일 주소나 비밀번호가 맞지 않아요");
      setHint(true);
      return;
    }
    router.replace("/");
    router.refresh();
  }

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
    go("password");
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < MIN_PASSWORD) {
      setError(`비밀번호는 ${MIN_PASSWORD}자 이상으로 정해 주세요`);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(errorMessage(error));
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh flex-col px-6 pt-[14vh] pb-8">
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
        {step === "signin" && (
          <form onSubmit={signIn} className="space-y-3">
            <label className="label" htmlFor="email">
              학교 메일
            </label>
            <input
              id="email"
              className="input"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              placeholder="student@school.ac.kr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label className="label" htmlFor="password">
              비밀번호
            </label>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
              show={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            {hint && (
              <p className="rounded-xl bg-zinc-100 px-3.5 py-3 text-[13px] leading-relaxed text-zinc-600">
                예전에 인증번호로만 가입하셨다면 아직 비밀번호가 없어요. 아래{" "}
                <b className="font-semibold text-zinc-900">비밀번호 찾기</b>에서 한 번만 정하면 다음부터는 바로
                로그인돼요.
              </p>
            )}
            <button className="btn-primary w-full" disabled={loading || !email || !password}>
              {loading ? "로그인 중" : "로그인"}
            </button>
            <div className="flex justify-between pt-1 text-sm text-zinc-600">
              <button type="button" onClick={() => go("email", "signup")}>
                처음이신가요? <b className="font-semibold text-zinc-900">가입하기</b>
              </button>
              <button type="button" onClick={() => go("email", "reset")}>
                비밀번호 찾기
              </button>
            </div>
          </form>
        )}

        {step === "email" && (
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
              autoComplete="username"
              autoCapitalize="none"
              placeholder="student@school.ac.kr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
            />
            <p className="text-[13px] text-zinc-500">
              {intent === "signup"
                ? "재학생 확인을 위해 학교 메일로만 가입할 수 있어요."
                : "가입할 때 쓴 학교 메일로 인증번호를 보내 드려요."}
            </p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? "보내는 중" : "인증번호 받기"}
            </button>
            <button type="button" className="w-full pt-1 text-sm text-zinc-600" onClick={() => go("signin")}>
              로그인으로 돌아가기
            </button>
          </form>
        )}

        {step === "code" && (
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
            <p className="text-[13px] text-zinc-500">메일이 안 보이면 스팸함도 확인해 주세요.</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button className="btn-primary w-full" disabled={loading || code.length < CODE_MIN}>
              {loading ? "확인 중" : "확인"}
            </button>
            <div className="flex justify-between pt-1 text-sm text-zinc-600">
              <button type="button" onClick={() => go("email")}>
                메일 주소 바꾸기
              </button>
              <button
                type="button"
                disabled={cooldown > 0 || loading}
                onClick={sendCode}
                className="disabled:text-zinc-400"
              >
                {cooldown > 0 ? `다시 받기 (${cooldown}초)` : "다시 받기"}
              </button>
            </div>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={savePassword} className="space-y-3">
            <label className="label" htmlFor="new-password">
              {intent === "signup" ? "쓸 비밀번호를 정해 주세요" : "새 비밀번호"}
            </label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              show={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
              autoFocus
            />
            <p className="text-[13px] text-zinc-500">
              {MIN_PASSWORD}자 이상. 다음부터는 메일 확인 없이 바로 로그인할 수 있어요.
            </p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button className="btn-taxi w-full" disabled={loading || password.length < MIN_PASSWORD}>
              {loading ? "저장 중" : intent === "signup" ? "시작하기" : "비밀번호 바꾸기"}
            </button>
          </form>
        )}
      </div>

      {step === "signin" && (
        <ul className="mt-10 space-y-2.5 text-[14px] text-zinc-600">
          {[
            ["학교 메일 인증", "재학생만 가입할 수 있어요"],
            ["수수료 없음", "택시비는 탄 사람끼리 나눠요"],
            ["신고·차단", "문제가 생기면 바로 알려 주세요"],
          ].map(([title, desc]) => (
            <li key={title} className="flex gap-2">
              <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-taxi" />
              <span>
                <b className="font-semibold text-zinc-800">{title}</b> · {desc}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-auto pt-10 text-center text-[12px] leading-relaxed text-zinc-500">
        <Link href="/terms" className="underline underline-offset-2">
          이용약관
        </Link>
        {" · "}
        <Link href="/privacy" className="underline underline-offset-2">
          개인정보처리방침
        </Link>
      </p>
    </main>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
  autoFocus,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        className="input pr-16"
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        autoCapitalize="none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        required
      />
      <button
        type="button"
        className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg px-2 py-1 text-[13px] text-zinc-600"
        onClick={onToggle}
      >
        {show ? "숨기기" : "보기"}
      </button>
    </div>
  );
}
