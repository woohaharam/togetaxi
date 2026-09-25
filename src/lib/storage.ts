// 사파리 개인정보 보호 모드 등에서는 localStorage 접근이 막힐 수 있다
export function getFlag(key: string) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function setFlag(key: string) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    // 저장 못 해도 기능에는 문제 없음
  }
}
