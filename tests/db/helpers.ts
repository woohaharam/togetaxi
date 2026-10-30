import { Client } from "pg";

const CONNECTION = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

/**
 * 로컬 Supabase에 직접 붙어 RLS와 RPC를 사용자 권한으로 돌려 본다.
 * 화면 코드를 거치지 않으므로, API를 직접 호출하는 사람이 할 수 있는 일과 같다.
 */
export async function connect() {
  const db = new Client({ connectionString: CONNECTION });
  await db.connect();
  return db;
}

/** auth.uid()가 p_user를 가리키는 상태로 쿼리한다. 실패해도 트랜잭션이 깨지지 않는다. */
export async function asUser(db: Client, userId: string, sql: string, params: unknown[] = []) {
  const claims = JSON.stringify({ sub: userId, role: "authenticated", email: `${userId}@dongguk.ac.kr` });
  await db.query("savepoint as_user");
  await db.query("select set_config('request.jwt.claims', $1, true)", [claims]);
  await db.query("set local role authenticated");
  try {
    const result = await db.query(sql, params);
    await db.query("reset role");
    await db.query("release savepoint as_user");
    return result;
  } catch (error) {
    await db.query("rollback to savepoint as_user");
    await db.query("reset role");
    throw error;
  }
}

/** 로그인하지 않은 방문자(anon 역할)로 쿼리한다. */
export async function asAnon(db: Client, sql: string, params: unknown[] = []) {
  await db.query("savepoint as_anon");
  await db.query("set local role anon");
  try {
    const result = await db.query(sql, params);
    await db.query("reset role");
    await db.query("release savepoint as_anon");
    return result;
  } catch (error) {
    await db.query("rollback to savepoint as_anon");
    await db.query("reset role");
    throw error;
  }
}

export type Person = { id: string; nickname: string };

/** auth.users와 profiles를 한 번에 만든다. 관리자 권한으로 도는 준비 과정이다. */
export async function createPerson(
  db: Client,
  nickname: string,
  gender: "male" | "female",
  universityId: number,
): Promise<Person> {
  const email = `${nickname}-${Math.random().toString(36).slice(2, 8)}@dongguk.ac.kr`;
  const { rows } = await db.query(
    `insert into auth.users (id, instance_id, aud, role, email)
     values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $1)
     returning id`,
    [email],
  );
  const id: string = rows[0].id;
  await db.query("insert into public.profiles (id, nickname, gender, university_id) values ($1, $2, $3, $4)", [
    id,
    nickname,
    gender,
    universityId,
  ]);
  return { id, nickname };
}

/** 모집을 연다. 호출자가 방장이 된다. */
export async function createRide(
  db: Client,
  host: Person,
  options: { destination?: string; capacity?: number; sameGenderOnly?: boolean; departInHours?: number } = {},
) {
  const { rows } = await asUser(
    db,
    host.id,
    "select public.create_ride($1, $2, now() + make_interval(hours => $3), $4, $5, null, null) as id",
    [
      "정문",
      options.destination ?? "신경주역",
      options.departInHours ?? 2,
      options.capacity ?? 4,
      options.sameGenderOnly ?? false,
    ],
  );
  return rows[0].id as string;
}

/** 에러 메시지를 돌려준다. 쿼리가 성공해 버리면 테스트를 실패시킨다. */
export async function errorOf(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error("막혔어야 하는 동작이 성공했습니다");
}
