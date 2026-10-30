// 사파리 개인정보 보호 모드 등에서는 localStorage 접근이 막힐 수 있다
export function readStored(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 저장 못 해도 기능에는 문제 없음
  }
}

export function getFlag(key: string) {
  return readStored(key) === "1";
}

export function setFlag(key: string) {
  writeStored(key, "1");
}
