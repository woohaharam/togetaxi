// 약관·개인정보처리방침에 들어가는 운영자 정보. 바뀌면 여기만 고치면 된다.
export const SITE = {
  name: "같이타",
  url: "https://togetaxi.vercel.app",
  operator: "르숲",
  privacyOfficer: "르숲",
  contactEmail: null as string | null,
  effectiveDate: "2026년 9월 25일",
};

export const CONTACT_TEXT = SITE.contactEmail
  ? `${SITE.contactEmail} 또는 앱의 '의견 보내기'`
  : "앱의 [내 택시 → 의견 보내기]";
