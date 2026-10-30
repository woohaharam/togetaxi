import type { Client } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { asAnon, asUser, connect, createPerson, createRide, errorOf, type Person } from "./helpers";

/**
 * 모집 참여·채팅·신고 규칙은 모두 데이터베이스 안에 있다.
 * 화면을 거치지 않고 API를 직접 부르는 사람도 같은 제한을 받는지 확인한다.
 */
describe("데이터베이스 규칙", () => {
  let db: Client;
  let university: number;
  let host: Person;
  let rider: Person;
  let stranger: Person;

  beforeAll(async () => {
    db = await connect();
    const { rows } = await db.query("select id from public.universities where campus = 'WISE캠퍼스' limit 1");
    university = rows[0].id;
  });

  afterAll(async () => {
    await db?.end();
  });

  // 테스트마다 롤백해서 서로 영향을 주지 않게 한다.
  beforeEach(async () => {
    await db.query("begin");
    host = await createPerson(db, "방장", "male", university);
    rider = await createPerson(db, "참여자", "female", university);
    stranger = await createPerson(db, "제삼자", "male", university);
  });

  afterEach(async () => {
    await db.query("rollback");
  });

  describe("가입", () => {
    it("학교 메일이 아니면 계정을 만들 수 없다", async () => {
      const message = await errorOf(() =>
        db.query(
          `insert into auth.users (id, instance_id, aud, role, email)
           values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'me@gmail.com')`,
        ),
      );
      expect(message).toContain("학교 메일");
    });

    it.each([".ac.kr", ".edu"])("%s 메일은 가입할 수 있다", async (suffix) => {
      await expect(
        db.query(
          `insert into auth.users (id, instance_id, aud, role, email)
           values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $1)`,
          [`someone${Date.now()}@school${suffix}`],
        ),
      ).resolves.toBeDefined();
    });

    it("성별과 학교는 가입 뒤에 바꿀 수 없다", async () => {
      // 동성 제한을 우회하려고 성별만 바꾸는 것을 막는다.
      const message = await errorOf(() =>
        asUser(db, host.id, "update public.profiles set gender = 'female' where id = $1", [host.id]),
      );
      expect(message).toContain("permission denied");
    });

    it("닉네임과 정산 정보는 본인만 바꾼다", async () => {
      await asUser(db, host.id, "update public.profiles set nickname = '바꾼이름' where id = $1", [host.id]);
      const { rows } = await db.query("select nickname from public.profiles where id = $1", [host.id]);
      expect(rows[0].nickname).toBe("바꾼이름");

      const { rowCount } = await asUser(db, stranger.id, "update public.profiles set nickname = '뺏기' where id = $1", [
        host.id,
      ]);
      expect(rowCount).toBe(0);
    });
  });

  describe("모집 참여", () => {
    it("정원을 넘겨 탈 수 없다", async () => {
      const ride = await createRide(db, host, { capacity: 2 });
      await asUser(db, rider.id, "select public.join_ride($1)", [ride]);

      const message = await errorOf(() => asUser(db, stranger.id, "select public.join_ride($1)", [ride]));
      expect(message).toContain("자리가 다 찼어요");

      const { rows } = await db.query("select member_count from public.rides where id = $1", [ride]);
      expect(rows[0].member_count).toBe(2);
    });

    it("동성끼리 타는 모집에는 다른 성별이 못 들어온다", async () => {
      const ride = await createRide(db, host, { sameGenderOnly: true }); // 방장이 남자
      const message = await errorOf(() => asUser(db, rider.id, "select public.join_ride($1)", [ride]));
      expect(message).toContain("동성끼리만");

      await expect(asUser(db, stranger.id, "select public.join_ride($1)", [ride])).resolves.toBeDefined();
    });

    it("출발 시간이 지난 모집에는 못 들어온다", async () => {
      const ride = await createRide(db, host);
      await db.query("update public.rides set depart_at = now() - interval '1 minute' where id = $1", [ride]);

      const message = await errorOf(() => asUser(db, rider.id, "select public.join_ride($1)", [ride]));
      expect(message).toContain("이미 출발했어요");
    });

    it("두 번 눌러도 인원이 두 번 늘지 않는다", async () => {
      const ride = await createRide(db, host);
      await asUser(db, rider.id, "select public.join_ride($1)", [ride]);
      await asUser(db, rider.id, "select public.join_ride($1)", [ride]);

      const { rows } = await db.query("select member_count from public.rides where id = $1", [ride]);
      expect(rows[0].member_count).toBe(2);
    });

    it("모집 중인 공고는 한 번에 3개까지", async () => {
      for (let i = 0; i < 3; i += 1) {
        await createRide(db, host, { destination: `목적지${i}` });
      }
      const message = await errorOf(() => createRide(db, host, { destination: "네 번째" }));
      expect(message).toContain("3개까지");
    });

    it("테이블을 직접 고쳐 끼어들 수 없다", async () => {
      const ride = await createRide(db, host);
      const message = await errorOf(() =>
        asUser(db, stranger.id, "insert into public.ride_members (ride_id, user_id) values ($1, $2)", [
          ride,
          stranger.id,
        ]),
      );
      expect(message).toContain("permission denied");
    });
  });

  describe("차단", () => {
    it("차단하면 서로의 모집에 들어갈 수 없다", async () => {
      await asUser(db, rider.id, "insert into public.blocks (blocker_id, blocked_id) values ($1, $2)", [
        rider.id,
        host.id,
      ]);

      // 차단한 사람이 연 모집
      const hostRide = await createRide(db, host);
      expect(await errorOf(() => asUser(db, rider.id, "select public.join_ride($1)", [hostRide]))).toContain(
        "참여할 수 없는",
      );

      // 반대 방향도 막힌다
      const riderRide = await createRide(db, rider);
      expect(await errorOf(() => asUser(db, host.id, "select public.join_ride($1)", [riderRide]))).toContain(
        "참여할 수 없는",
      );
    });

    it("차단 목록은 본인만 본다", async () => {
      await asUser(db, rider.id, "insert into public.blocks (blocker_id, blocked_id) values ($1, $2)", [
        rider.id,
        host.id,
      ]);
      const mine = await asUser(db, rider.id, "select * from public.blocks");
      const others = await asUser(db, stranger.id, "select * from public.blocks");
      expect(mine.rowCount).toBe(1);
      expect(others.rowCount).toBe(0);
    });
  });

  describe("채팅", () => {
    it("참여자가 아니면 읽지도 쓰지도 못한다", async () => {
      const ride = await createRide(db, host);
      await asUser(db, host.id, "insert into public.messages (ride_id, user_id, content) values ($1, $2, '안녕하세요')", [
        ride,
        host.id,
      ]);

      const outsider = await asUser(db, stranger.id, "select * from public.messages where ride_id = $1", [ride]);
      expect(outsider.rowCount).toBe(0);

      const message = await errorOf(() =>
        asUser(db, stranger.id, "insert into public.messages (ride_id, user_id, content) values ($1, $2, '끼어들기')", [
          ride,
          stranger.id,
        ]),
      );
      expect(message).toContain("row-level security");
    });

    it("남의 이름으로 메시지를 쓸 수 없다", async () => {
      const ride = await createRide(db, host);
      await asUser(db, rider.id, "select public.join_ride($1)", [ride]);

      const message = await errorOf(() =>
        asUser(db, rider.id, "insert into public.messages (ride_id, user_id, content) values ($1, $2, '사칭')", [
          ride,
          host.id,
        ]),
      );
      expect(message).toContain("row-level security");
    });

    it("시스템 안내 메시지를 꾸며낼 수 없다", async () => {
      // user_id가 null이면 화면에 운영 안내처럼 보인다.
      const ride = await createRide(db, host);
      const message = await errorOf(() =>
        asUser(db, host.id, "insert into public.messages (ride_id, user_id, content) values ($1, null, '방장이 취소함')", [
          ride,
        ]),
      );
      expect(message).toContain("row-level security");
    });

    it("보낸 메시지는 고치거나 지울 수 없다", async () => {
      const ride = await createRide(db, host);
      const { rows } = await asUser(
        db,
        host.id,
        "insert into public.messages (ride_id, user_id, content) values ($1, $2, '원본') returning id",
        [ride, host.id],
      );
      const id = rows[0].id;

      expect(await errorOf(() => asUser(db, host.id, "update public.messages set content = '수정' where id = $1", [id]))).toContain(
        "permission denied",
      );
      expect(await errorOf(() => asUser(db, host.id, "delete from public.messages where id = $1", [id]))).toContain(
        "permission denied",
      );
    });

    // 띄어쓰기나 숫자를 끼워 넣는 우회까지는 막되, 멀쩡한 문장을 막지 않는 쪽을 우선한다.
    it.each(["씨발", "씨 발", "씨1발", "ㅅ.ㅂ", "병 신", "시발", "아 시발 늦었다", "진짜시발"])(
      "욕설은 저장되지 않는다: %s",
      async (text) => {
        const ride = await createRide(db, host);
        const message = await errorOf(() =>
          asUser(db, host.id, "insert into public.messages (ride_id, user_id, content) values ($1, $2, $3)", [
            ride,
            host.id,
            text,
          ]),
        );
        expect(message).toContain("부적절한 표현");
      },
    );

    // '시발'은 시간·지명 표현과 겹친다. 이쪽이 막히면 평범한 대화가 안 된다.
    it.each(["시발점에서 만나요", "5시 발 기차 타요", "5시발 기차", "버스 시발역", "3시에 출발해요"])(
      "멀쩡한 말은 통과한다: %s",
      async (text) => {
        const ride = await createRide(db, host);
        await expect(
          asUser(db, host.id, "insert into public.messages (ride_id, user_id, content) values ($1, $2, $3)", [
            ride,
            host.id,
            text,
          ]),
        ).resolves.toBeDefined();
      },
    );

    it("닉네임과 모집 글에도 같은 기준이 적용된다", async () => {
      expect(
        await errorOf(() => asUser(db, host.id, "update public.profiles set nickname = $1 where id = $2", ["씨발놈", host.id])),
      ).toContain("부적절한 표현");

      expect(
        await errorOf(() =>
          asUser(db, host.id, "select public.create_ride('정문', '신경주역', now() + interval '2 hours', 4, false, null, $1)", [
            "씨발 빨리 와라",
          ]),
        ),
      ).toContain("부적절한 표현");
    });
  });

  describe("방장 권한", () => {
    it("방장만 마감·취소할 수 있다", async () => {
      const ride = await createRide(db, host);
      await asUser(db, rider.id, "select public.join_ride($1)", [ride]);

      expect(await errorOf(() => asUser(db, rider.id, "select public.set_ride_status($1, 'closed')", [ride]))).toContain(
        "방장만",
      );
      await expect(asUser(db, host.id, "select public.set_ride_status($1, 'closed')", [ride])).resolves.toBeDefined();
    });

    it("방장만 내보낼 수 있고, 자기 자신은 못 내보낸다", async () => {
      const ride = await createRide(db, host);
      await asUser(db, rider.id, "select public.join_ride($1)", [ride]);

      expect(
        await errorOf(() => asUser(db, rider.id, "select public.kick_member($1, $2)", [ride, host.id])),
      ).toContain("방장만");
      expect(
        await errorOf(() => asUser(db, host.id, "select public.kick_member($1, $2)", [ride, host.id])),
      ).toContain("자기 자신");

      await asUser(db, host.id, "select public.kick_member($1, $2)", [ride, rider.id]);
      const { rows } = await db.query("select member_count from public.rides where id = $1", [ride]);
      expect(rows[0].member_count).toBe(1);
    });

    it("방장은 나갈 수 없다", async () => {
      const ride = await createRide(db, host);
      expect(await errorOf(() => asUser(db, host.id, "select public.leave_ride($1)", [ride]))).toContain(
        "방장은 나갈 수 없어요",
      );
    });

    it("정산 금액은 방장만 올린다", async () => {
      const ride = await createRide(db, host);
      await asUser(db, rider.id, "select public.join_ride($1)", [ride]);

      expect(await errorOf(() => asUser(db, rider.id, "select public.set_final_fare($1, 10000)", [ride]))).toContain(
        "방장만",
      );

      await asUser(db, host.id, "select public.set_final_fare($1, 14800)", [ride]);
      const { rows } = await db.query(
        "select content from public.messages where ride_id = $1 and user_id is null order by id desc limit 1",
        [ride],
      );
      expect(rows[0].content).toContain("7,400원"); // 2명이 나눠 100원 단위로 올림
    });
  });

  describe("운영자 기능", () => {
    it("운영자가 아니면 통계를 볼 수 없다", async () => {
      expect(await errorOf(() => asUser(db, host.id, "select public.admin_stats()"))).toContain("권한이 없어요");
      expect(await errorOf(() => asUser(db, host.id, "select public.admin_inbox()"))).toContain("권한이 없어요");
    });

    it("운영자로 등록하면 볼 수 있다", async () => {
      await db.query("insert into public.admins (user_id) values ($1)", [host.id]);
      const { rows } = await asUser(db, host.id, "select public.admin_stats() as stats");
      expect(rows[0].stats).toHaveProperty("users");
    });

    it("운영자 목록에 스스로 들어갈 수 없다", async () => {
      const message = await errorOf(() =>
        asUser(db, host.id, "insert into public.admins (user_id) values ($1)", [host.id]),
      );
      expect(message).toMatch(/permission denied|row-level security/);
    });
  });

  describe("탈퇴", () => {
    it("방장이 탈퇴하면 모집이 취소되고 대화는 남는다", async () => {
      const ride = await createRide(db, host);
      await asUser(db, rider.id, "select public.join_ride($1)", [ride]);
      await asUser(db, rider.id, "insert into public.messages (ride_id, user_id, content) values ($1, $2, '곧 도착해요')", [
        ride,
        rider.id,
      ]);

      await asUser(db, host.id, "select public.delete_account()");

      const { rows } = await db.query("select status, host_id from public.rides where id = $1", [ride]);
      expect(rows[0].status).toBe("cancelled");
      expect(rows[0].host_id).toBeNull(); // 모집은 남되 사람과의 연결은 끊긴다

      const kept = await db.query("select count(*)::int as n from public.messages where ride_id = $1", [ride]);
      expect(kept.rows[0].n).toBeGreaterThan(0);
    });

    it("참여자가 탈퇴하면 자리가 하나 빈다", async () => {
      const ride = await createRide(db, host);
      await asUser(db, rider.id, "select public.join_ride($1)", [ride]);
      await asUser(db, rider.id, "select public.delete_account()");

      const { rows } = await db.query("select member_count from public.rides where id = $1", [ride]);
      expect(rows[0].member_count).toBe(1);
    });

    it("신고 기록은 신고한 사람이 떠나도 남는다", async () => {
      const ride = await createRide(db, host);
      await asUser(
        db,
        rider.id,
        "insert into public.reports (reporter_id, target_user_id, ride_id, reason) values ($1, $2, $3, 'no_show')",
        [rider.id, host.id, ride],
      );

      await asUser(db, rider.id, "select public.delete_account()");

      const { rows } = await db.query("select reporter_id from public.reports");
      expect(rows).toHaveLength(1);
      expect(rows[0].reporter_id).toBeNull();
    });
  });

  describe("로그인하지 않은 방문자", () => {
    it("학교 목록은 볼 수 있다", async () => {
      const { rowCount } = await asAnon(db, "select id from public.universities limit 5");
      expect(rowCount).toBe(5);
    });

    it("모집과 프로필은 볼 수 없다", async () => {
      await createRide(db, host);
      expect((await asAnon(db, "select * from public.rides")).rowCount).toBe(0);
      expect((await asAnon(db, "select * from public.profiles")).rowCount).toBe(0);
    });

    it("모집 관련 함수를 부를 수 없다", async () => {
      expect(await errorOf(() => asAnon(db, "select public.join_ride(gen_random_uuid())"))).toContain(
        "permission denied",
      );
    });
  });
});
