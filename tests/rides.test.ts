import { describe, expect, it } from "vitest";
import { joinBlocker, rideState } from "@/lib/rides";
import type { Gender, Ride } from "@/lib/types";

const HOUR = 60 * 60 * 1000;

function ride(overrides: Partial<Ride> = {}): Ride {
  return {
    id: "r1",
    host_id: "host",
    university_id: 1,
    origin: "정문",
    destination: "신경주역",
    depart_at: new Date(Date.now() + HOUR).toISOString(),
    capacity: 4,
    member_count: 1,
    peak_members: 1,
    same_gender_only: false,
    host_gender: "male",
    estimated_fare: null,
    final_fare: null,
    note: null,
    status: "open",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

const me = (gender: Gender) => ({ gender });

describe("rideState", () => {
  it("모집 중", () => {
    expect(rideState(ride())).toBe("open");
  });

  it("자리가 차면 full", () => {
    expect(rideState(ride({ member_count: 4, capacity: 4 }))).toBe("full");
  });

  it("방장이 마감하면 closed", () => {
    expect(rideState(ride({ status: "closed" }))).toBe("closed");
  });

  it("출발 시간이 지나면 departed", () => {
    expect(rideState(ride({ depart_at: new Date(Date.now() - HOUR).toISOString() }))).toBe("departed");
  });

  // 겹치는 상태에서 무엇을 먼저 보여줄지가 목록 뱃지 문구를 정한다.
  it("취소가 다른 모든 상태보다 앞선다", () => {
    const cancelled = ride({
      status: "cancelled",
      member_count: 4,
      depart_at: new Date(Date.now() - HOUR).toISOString(),
    });
    expect(rideState(cancelled)).toBe("cancelled");
  });

  it("출발이 마감보다 앞선다", () => {
    const departed = ride({ status: "closed", depart_at: new Date(Date.now() - HOUR).toISOString() });
    expect(rideState(departed)).toBe("departed");
  });
});

describe("joinBlocker", () => {
  it("참여할 수 있으면 null", () => {
    expect(joinBlocker(ride(), me("female"))).toBeNull();
  });

  it.each([
    ["취소된 모집이에요", ride({ status: "cancelled" })],
    ["이미 출발했어요", ride({ depart_at: new Date(Date.now() - HOUR).toISOString() })],
    ["모집이 끝났어요", ride({ status: "closed" })],
    ["자리가 다 찼어요", ride({ member_count: 4, capacity: 4 })],
  ])("%s", (reason, r) => {
    expect(joinBlocker(r, me("female"))).toBe(reason);
  });

  it("동성 제한은 다른 성별만 막는다", () => {
    const womenOnly = ride({ same_gender_only: true, host_gender: "female" });
    expect(joinBlocker(womenOnly, me("male"))).toBe("여자만 탈 수 있어요");
    expect(joinBlocker(womenOnly, me("female"))).toBeNull();
  });

  // 화면에서 막는 것과 별개로 서버도 같은 규칙을 검사한다(tests/db/policies.test.ts).
  it("동성 제한보다 정원이 먼저 걸린다", () => {
    const full = ride({ same_gender_only: true, host_gender: "female", member_count: 4 });
    expect(joinBlocker(full, me("male"))).toBe("자리가 다 찼어요");
  });
});
