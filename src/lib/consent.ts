"use client";

import { readStored, writeStored } from "./storage";

/** 광고 쿠키 동의. 동의하기 전에는 광고 스크립트를 아예 불러오지 않는다. */
export type Consent = "granted" | "denied" | null;

const KEY = "ad-consent";
const listeners = new Set<() => void>();

export function getConsent(): Consent {
  const v = readStored(KEY);
  return v === "granted" || v === "denied" ? v : null;
}

export function setConsent(value: Exclude<Consent, null>) {
  writeStored(KEY, value);
  listeners.forEach((l) => l());
}

export function onConsentChange(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
