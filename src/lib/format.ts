import type { University } from "./types";

const TZ = "Asia/Seoul";

function kstDateKey(d: Date) {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

/** "오늘 18:30", "내일 09:00", "9월 26일 (금) 14:00" */
export function formatDepart(iso: string) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("ko-KR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const key = kstDateKey(d);
  if (key === kstDateKey(now)) return `오늘 ${time}`;
  if (key === kstDateKey(tomorrow)) return `내일 ${time}`;
  const date = d.toLocaleDateString("ko-KR", {
    timeZone: TZ,
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  return `${date} ${time}`;
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
  });
}

export function won(n: number) {
  return `${n.toLocaleString("ko-KR")}원`;
}

/** 1인당 금액 (100원 단위 올림) */
export function perPerson(total: number, people: number) {
  return Math.ceil(total / Math.max(people, 1) / 100) * 100;
}

export function universityLabel(u: Pick<University, "name" | "campus"> | null | undefined) {
  if (!u) return "";
  return u.campus ? `${u.name} ${u.campus}` : u.name;
}

/** datetime-local 입력값(한국 시간 기준)을 ISO 문자열로 */
export function kstLocalToIso(local: string) {
  return new Date(`${local}:00+09:00`).toISOString();
}

/** 현재 한국 시간을 datetime-local 형식으로 (분 단위 올림) */
export function nowKstLocal(offsetMinutes = 0) {
  const d = new Date(Date.now() + offsetMinutes * 60 * 1000 + 9 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 16);
}

export function errorMessage(e: unknown) {
  if (e && typeof e === "object" && "message" in e) {
    const msg = String((e as { message: unknown }).message);
    if (msg.includes("Database error saving new user")) {
      return "대학교 이메일(.ac.kr, .edu)로만 가입할 수 있어요";
    }
    if (msg.includes("profiles_nickname_key")) return "이미 사용 중인 닉네임이에요";
    if (msg.includes("universities_name_campus_key")) return "이미 등록된 학교예요";
    return msg;
  }
  return "알 수 없는 오류가 발생했어요";
}
