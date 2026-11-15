import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withUser } from "./client";
import { profiles, userAchievements } from "./schema";
import { type TestDb, createTestDb } from "./testing";

const ANA = "11111111-1111-4111-8111-111111111111";
const BIA = "22222222-2222-4222-8222-222222222222";

let test: TestDb;
const as = <T>(id: string, fn: Parameters<typeof withUser<T>>[2]) => withUser(test.db, { sub: id }, fn);

beforeAll(async () => {
  test = await createTestDb();
  for (const [id, username] of [
    [ANA, "ana"],
    [BIA, "bia"],
  ] as const) {
    await test.createAuthUser(id);
    await as(id, (tx) => tx.insert(profiles).values({ id, username, displayName: username }));
  }
  // Conquistas são gravadas só pela API (dona das tabelas).
  await test.db.insert(userAchievements).values([
    { userId: ANA, key: "primeira-mesa" },
    { userId: ANA, key: "primeiro-encontro" },
  ]);
});

afterAll(async () => {
  await test.close();
});

describe("RLS de user_achievements", () => {
  it("está ligada", async () => {
    const rows = (await test.db.execute(sql`select relrowsecurity from pg_class where relname = 'user_achievements'`)) as unknown as {
      rows: { relrowsecurity: boolean }[];
    };
    expect(rows.rows[0]?.relrowsecurity).toBe(true);
  });

  it("quem é de fora lê as desbloqueadas, menos as do casal (diriam quem tem par)", async () => {
    const rows = await as(BIA, (tx) => tx.select({ key: userAchievements.key }).from(userAchievements));
    expect(rows.map((row) => row.key)).toEqual(["primeira-mesa"]);
    const own = await as(ANA, (tx) => tx.select({ key: userAchievements.key }).from(userAchievements));
    expect(own.map((row) => row.key).sort()).toEqual(["primeira-mesa", "primeiro-encontro"]);
  });

  it("se a pessoa já viu a animação só a API sabe", async () => {
    await expect(as(BIA, (tx) => tx.select({ seenAt: userAchievements.seenAt }).from(userAchievements))).rejects.toThrow();
  });

  it("ninguém grava nem altera direto, nem a própria pessoa", async () => {
    await expect(as(ANA, (tx) => tx.insert(userAchievements).values({ userId: ANA, key: "fregues" }))).rejects.toThrow();
    await expect(as(ANA, (tx) => tx.update(userAchievements).set({ seenAt: new Date() }))).rejects.toThrow();
    await expect(as(BIA, (tx) => tx.delete(userAchievements))).rejects.toThrow();
  });

  it("uma conquista por pessoa", async () => {
    await expect(test.db.insert(userAchievements).values({ userId: ANA, key: "primeira-mesa" })).rejects.toThrow();
    expect(await test.db.select().from(userAchievements)).toHaveLength(2);
  });

  it("anon não lê", async () => {
    await expect(
      test.db.transaction(async (tx) => {
        await tx.execute(sql`set local role anon`);
        return tx.select().from(userAchievements);
      }),
    ).rejects.toThrow();
  });
});
