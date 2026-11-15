import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type TestDb, createTestDb } from "./testing";

let test: TestDb;

beforeAll(async () => {
  test = await createTestDb();
});

afterAll(async () => {
  await test.close();
});

describe("índices", () => {
  it("visitas 'juntos' são achadas pelo par sem varrer a tabela (conquistas, Wrapped, policies)", async () => {
    const rows = await test.db.execute<{ indexdef: string }>(sql`select indexdef from pg_indexes where tablename = 'visits' and indexname = 'visits_together_with_idx'`);
    const list = (Array.isArray(rows) ? rows : (rows as { rows: { indexdef: string }[] }).rows) as { indexdef: string }[];
    expect(list).toHaveLength(1);
    expect(list[0]!.indexdef).toContain("(together_with)");
  });
});
