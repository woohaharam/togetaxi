"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/format";

const UNIV_EMAIL = /\.(ac\.kr|edu)$/i;

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const addr = email.trim().toLowerCase();
    if (!UNIV_EMAIL.test(addr)) {
      setError("학교 이메일(.ac.kr, .edu)을 입력해 주세요");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email: addr });
    setLoading(false);
    if (error) return setError(errorMessage(error));
    setEmail(addr);
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "email" });
    setLoading(false);
    if (error) return setError("인증번호가 올바르지 않거나 만료됐어요");
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh flex-col justify-center px-6">
      <div className="mb-10">
        <div className="mb-4 text-5xl">🚕</div>
        <h1 className="text-3xl font-bold leading-tight">
          택시비,
          <br />
          <span className="bg-taxi px-1">같이타</span>면 반값
        </h1>
        <p className="mt-3 text-zinc-500">같은 방향 가는 학우와 택시를 나눠 타요</p>
      </div>

      {step === "email" ? (
        <form onSubmit={sendCode} className="space-y-3">
          <label className="block text-sm font-medium text-zinc-600">학교 이메일</label>
          <input
            className="input"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="학번@dongguk.ac.kr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <p className="text-xs text-zinc-400">
            재학생 인증을 위해 학교 이메일(.ac.kr, .edu)로만 가입할 수 있어요.
          </p>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "보내는 중…" : "인증번호 받기"}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-3">
          <label className="block text-sm font-medium text-zinc-600">
            <b className="text-zinc-900">{email}</b>로 보낸 6자리 인증번호
          </label>
          <input
            className="input text-center text-2xl tracking-[0.5em]"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            required
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button className="btn-primary w-full" disabled={loading || code.length !== 6}>
            {loading ? "확인 중…" : "시작하기"}
          </button>
          <button
            type="button"
            className="w-full py-2 text-sm text-zinc-500"
            onClick={() => {
              setStep("email");
              setCode("");
              setError("");
            }}
          >
            이메일 다시 입력
          </button>
        </form>
      )}
    </main>
  );
}
