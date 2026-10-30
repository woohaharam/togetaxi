import { describe, expect, it } from "vitest";
import {
  errorMessage,
  formatDepart,
  formatTime,
  kstLocalToIso,
  perPerson,
  universityLabel,
  won,
} from "@/lib/format";

// 날짜 포맷은 Intl을 쓰지 않고 직접 계산한다. 서버(UTC)와 브라우저(KST)가 같은
// 문자열을 내놓아야 하이드레이션이 깨지지 않기 때문에, 아래 기대값은 실행 환경의
// 시간대와 무관하게 항상 같아야 한다.
describe("formatDepart", () => {
  const now = "2026-03-10T05:00:00Z"; // KST 3월 10일 14:00

  it("같은 날이면 '오늘'", () => {
    expect(formatDepart("2026-03-10T09:30:00Z", new Date(now))).toBe("오늘 18:30");
  });

  it("다음 날이면 '내일'", () => {
    expect(formatDepart("2026-03-11T00:00:00Z", new Date(now))).toBe("내일 09:00");
  });

  it("그 밖에는 날짜와 요일", () => {
    expect(formatDepart("2026-03-13T05:00:00Z", new Date(now))).toBe("3월 13일 (금) 14:00");
  });

  it("해가 바뀌면 연도를 붙인다", () => {
    expect(formatDepart("2027-01-02T05:00:00Z", new Date(now))).toBe("2027년 1월 2일 (토) 14:00");
  });

  it("KST 자정을 기준으로 날짜가 넘어간다", () => {
    // 15:10 UTC = KST 다음 날 00:10. UTC 기준으로 나누면 '오늘'이 되어 틀린다.
    const justAfterMidnight = "2026-03-10T15:10:00Z";
    expect(formatDepart(justAfterMidnight, new Date(now))).toBe("내일 00:10");
  });
});

describe("formatTime", () => {
  it.each([
    ["2026-03-10T09:29:00Z", "오후 6:29"],
    ["2026-03-10T00:05:00Z", "오전 9:05"],
    ["2026-03-10T03:00:00Z", "오후 12:00"], // 정오는 12시로 적는다
    ["2026-03-10T15:00:00Z", "오전 12:00"], // 자정도 마찬가지
  ])("%s → %s", (iso, expected) => {
    expect(formatTime(iso)).toBe(expected);
  });
});

describe("perPerson", () => {
  it("나누어떨어지면 그대로", () => {
    expect(perPerson(14800, 2)).toBe(7400);
  });

  it("100원 단위로 올린다", () => {
    expect(perPerson(10000, 3)).toBe(3400);
  });

  it("모아서 내면 실제 요금보다 모자라지 않는다", () => {
    for (const [total, people] of [
      [10000, 3],
      [15800, 4],
      [7300, 3],
    ] as const) {
      expect(perPerson(total, people) * people).toBeGreaterThanOrEqual(total);
    }
  });

  it("인원이 0이어도 나누기 오류가 나지 않는다", () => {
    expect(perPerson(10000, 0)).toBe(10000);
  });
});

describe("won", () => {
  it.each([
    [0, "0원"],
    [900, "900원"],
    [15800, "15,800원"],
    [1234567, "1,234,567원"],
  ])("%i → %s", (value, expected) => {
    expect(won(value)).toBe(expected);
  });
});

describe("kstLocalToIso", () => {
  it("입력값을 한국 시간으로 읽는다", () => {
    expect(kstLocalToIso("2026-03-10T18:30")).toBe("2026-03-10T09:30:00.000Z");
  });
});

describe("universityLabel", () => {
  it("캠퍼스가 있으면 붙인다", () => {
    expect(universityLabel({ name: "동국대학교", campus: "WISE캠퍼스" })).toBe("동국대학교 WISE캠퍼스");
  });

  it("캠퍼스가 없으면 학교 이름만", () => {
    expect(universityLabel({ name: "서울대학교", campus: "" })).toBe("서울대학교");
  });

  it("학교가 없으면 빈 문자열", () => {
    expect(universityLabel(null)).toBe("");
  });
});

describe("errorMessage", () => {
  it("DB 제약 이름을 사람이 읽을 말로 바꾼다", () => {
    expect(errorMessage({ message: 'duplicate key value violates unique constraint "profiles_nickname_key"' })).toBe(
      "누가 이미 쓰고 있는 닉네임이에요",
    );
  });

  it("가입 메일 제한은 이유를 알려준다", () => {
    expect(errorMessage({ message: "Database error saving new user" })).toBe(
      "학교 메일(.ac.kr, .edu)로만 가입할 수 있어요",
    );
  });

  it("모르는 오류는 뭉뚱그려 안내한다", () => {
    expect(errorMessage(undefined)).toBe("문제가 생겼어요. 잠시 후 다시 시도해 주세요");
  });
});
