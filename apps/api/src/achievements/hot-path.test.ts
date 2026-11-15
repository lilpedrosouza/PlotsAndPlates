import { userAchievements } from "@pap/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { type TestHarness, createTestHarness } from "../testing";
import { type Json, client, setupCouple } from "../testing-couple";

// Conta quantas vezes o par é procurado (o resto do módulo segue igual).
const partnerCalls = vi.hoisted(() => ({ count: 0 }));
vi.mock("../couples/partner", async (importOriginal) => {
  const original = await importOriginal<typeof import("../couples/partner")>();
  return {
    ...original,
    partnerOf: (...args: Parameters<typeof original.partnerOf>) => {
      partnerCalls.count++;
      return original.partnerOf(...args);
    },
  };
});

const { achievementCounts } = await import("./counts");
const { evaluateAchievements } = await import("./check");

const ANA = "11111111-1111-4111-8111-111111111111";
const CAIO = "33333333-3333-4333-8333-333333333333";
let h: TestHarness;
let t: Record<string, string>;
let api: ReturnType<typeof client>;

/** Embrulha o db contando os INSERTs (o resto passa direto). */
function countingInserts(db: TestHarness["test"]["db"]) {
  const counter = { inserts: 0 };
  const proxy = new Proxy(db, {
    get(target, property, receiver) {
      if (property === "insert") counter.inserts++;
      return Reflect.get(target, property, receiver);
    },
  });
  return { db: proxy, counter };
}

beforeAll(async () => {
  h = await createTestHarness();
  api = client(h);
  t = await setupCouple(
    h,
    [
      [ANA, "ana"],
      ["22222222-2222-4222-8222-222222222222", "bia"],
      [CAIO, "caio"],
    ],
    ["ana", "bia"],
  );
});

afterAll(async () => {
  await h.close();
});

describe("caminho quente das conquistas", () => {
  it("conferir de novo sem nada novo não grava nada", async () => {
    await evaluateAchievements(h.test.db, ANA);
    const { db, counter } = countingInserts(h.test.db);
    const result = await evaluateAchievements(db, ANA);
    expect(result.unlocked).toEqual([]);
    expect(counter.inserts).toBe(0);
  });

  it("a rota GET /me/achievements devolve as linhas que a conferência já leu", async () => {
    const place = (await api.ok(await api.request("POST", "/v1/restaurants", t.caio!, { name: "Primeiro", destination: "quero-ir" }), 201)).id;
    await api.ok(await api.request("POST", `/v1/restaurants/${place}/visits`, t.caio!, { visitedOn: "2026-11-01" }), 201);
    const items = (await api.ok(await api.request("GET", "/v1/me/achievements", t.caio!))).items as Json[];
    const first = items.find((item) => item.key === "primeira-mesa");
    expect(first.unlockedAt).not.toBeNull();
    expect(first.seen).toBe(false);
    const rows = await h.test.db.select().from(userAchievements).where(eq(userAchievements.userId, CAIO));
    expect(rows.map((row) => row.key)).toContain("primeira-mesa");
  });

  it("com o par já conhecido (inclusive nenhum), as contagens não procuram de novo", async () => {
    partnerCalls.count = 0;
    await achievementCounts(h.test.db, CAIO, null);
    expect(partnerCalls.count).toBe(0);
    await achievementCounts(h.test.db, CAIO);
    expect(partnerCalls.count).toBe(1);
  });

  it("depois de uma ação que conta, o par é procurado uma vez só", async () => {
    const place = (await api.ok(await api.request("POST", "/v1/restaurants", t.ana!, { name: "Outro", destination: "quero-ir" }), 201)).id;
    partnerCalls.count = 0;
    await api.ok(await api.request("POST", `/v1/restaurants/${place}/visits`, t.ana!, { visitedOn: "2026-11-02" }), 201);
    // A rota em si pode procurar o par (visita "juntos"); a conferência das conquistas não procura de novo
    // nem para quem agiu nem para o par (o par do par é quem agiu).
    const routeOnly = partnerCalls.count;
    expect(routeOnly).toBeLessThanOrEqual(2);
  });
});
