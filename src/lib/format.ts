import type { University } from "./types";

// 서버(Node)와 브라우저의 Intl 출력이 미묘하게 달라 하이드레이션이 깨지므로 직접 포맷한다.
const KST_OFFSET = 9 * 60 * 60 * 1000;
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function kst(date: Date) {
  const d = new Date(date.getTime() + KST_OFFSET);
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth() + 1,
    d: d.getUTCDate(),
    w: d.getUTCDay(),
    hh: d.getUTCHours(),
    mm: d.getUTCMinutes(),
    dayKey: Math.floor(d.getTime() / 86_400_000),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 오늘 18:30 · 내일 09:00 · 9월 26일 (금) 14:00 */
export function formatDepart(iso: string, now = new Date()) {
  const t = kst(new Date(iso));
  const today = kst(now);
  const time = `${pad(t.hh)}:${pad(t.mm)}`;
  if (t.dayKey === today.dayKey) return `오늘 ${time}`;
  if (t.dayKey === today.dayKey + 1) return `내일 ${time}`;
  const year = t.y === today.y ? "" : `${t.y}년 `;
  return `${year}${t.m}월 ${t.d}일 (${WEEKDAYS[t.w]}) ${time}`;
}

/** 오후 6:29 */
export function formatTime(iso: string) {
  const { hh, mm } = kst(new Date(iso));
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${hh < 12 ? "오전" : "오후"} ${h12}:${pad(mm)}`;
}

export function won(n: number) {
  return `${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}원`;
}

/** 100원 단위 올림 */
export function perPerson(total: number, people: number) {
  return Math.ceil(total / Math.max(people, 1) / 100) * 100;
}

export function universityLabel(u: Pick<University, "name" | "campus"> | null | undefined) {
  if (!u) return "";
  return u.campus ? `${u.name} ${u.campus}` : u.name;
}

/** datetime-local 값은 한국 시간으로 본다 */
export function kstLocalToIso(local: string) {
  return new Date(`${local}:00+09:00`).toISOString();
}

/** 지금부터 offsetMinutes 뒤를 10분 단위로 올려 datetime-local 형식으로 */
export function kstLocalFromNow(offsetMinutes = 0) {
  const step = 10 * 60 * 1000;
  const t = Math.ceil((Date.now() + offsetMinutes * 60 * 1000) / step) * step;
  return new Date(t + KST_OFFSET).toISOString().slice(0, 16);
}

export function errorMessage(e: unknown) {
  if (e && typeof e === "object" && "message" in e) {
    const msg = String((e as { message: unknown }).message);
    if (msg.includes("Database error saving new user")) {
      return "학교 메일(.ac.kr, .edu)로만 가입할 수 있어요";
    }
    if (/rate limit|security purposes/i.test(msg)) return "잠시 후에 다시 시도해 주세요";
    if (msg.includes("profiles_nickname_key")) return "누가 이미 쓰고 있는 닉네임이에요";
    if (msg.includes("universities_name_campus_key")) return "이미 목록에 있는 학교예요";
    if (/check constraint/.test(msg)) return "입력한 내용을 다시 확인해 주세요";
    return msg;
  }
  return "문제가 생겼어요. 잠시 후 다시 시도해 주세요";
}
