import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type TestHarness, createTestHarness } from "../testing";
import { type Json, client, setupCouple } from "../testing-couple";

let h: TestHarness;
let t: Record<string, string>;
let api: ReturnType<typeof client>;

const mine = async (who: string) => (await api.ok(await api.request("GET", "/v1/me/achievements", t[who]!))).items as Json[];
const state = async (who: string, key: string) => (await mine(who)).find((item: Json) => item.key === key);
const title = async (type: "movie" | "tv", tmdbId: number) => (await api.ok(await api.request("GET", `/v1/titles/by-tmdb/${type}/${tmdbId}`, t.ana!))).id as string;

beforeAll(async () => {
  h = await createTestHarness();
  api = client(h);
  t = await setupCouple(
    h,
    [
      ["11111111-1111-4111-8111-111111111111", "ana"],
      ["22222222-2222-4222-8222-222222222222", "bia"],
      ["33333333-3333-4333-8333-333333333333", "caio"],
      ["44444444-4444-4444-8444-444444444444", "duda"],
    ],
    ["ana", "bia"],
  );
});

afterAll(async () => {
  await h.close();
});

describe("conquistas", () => {
  it("o catálogo inteiro aparece com progresso, nada destravado no começo", async () => {
    const items = await mine("caio");
    expect(items).toHaveLength(16);
    expect(items.every((item: Json) => item.unlockedAt === null)).toBe(true);
    expect(items.find((item: Json) => item.key === "volta-ao-mundo")).toMatchObject({ progress: 0, target: 10, seen: false });
  });

  it("primeira visita destrava Primeira mesa na hora; vista não volta; apagar não tira", async () => {
    const place = (await api.ok(await api.request("POST", "/v1/restaurants", t.caio!, { name: "Primeiro Lugar", destination: "quero-ir" }), 201)).id;
    const visit = await api.ok(await api.request("POST", `/v1/restaurants/${place}/visits`, t.caio!, { visitedOn: "2026-11-01" }), 201);
    const first = await state("caio", "primeira-mesa");
    expect(first.unlockedAt).not.toBeNull();
    expect(first).toMatchObject({ progress: 1, seen: false });
    await api.ok(await api.request("POST", "/v1/me/achievements/seen", t.caio!, { keys: ["primeira-mesa"] }), 204);
    expect((await state("caio", "primeira-mesa")).seen).toBe(true);
    await api.ok(await api.request("DELETE", `/v1/visits/${visit.id}`, t.caio!), 204);
    expect((await state("caio", "primeira-mesa")).unlockedAt).not.toBeNull();
  });

  it("visita juntos conta para o par; virar par destrava Primeiro encontro para os dois", async () => {
    expect((await state("ana", "primeiro-encontro")).unlockedAt).not.toBeNull();
    expect((await state("bia", "primeiro-encontro")).unlockedAt).not.toBeNull();
    await api.ok(await api.request("POST", "/v1/restaurants", t.ana!, { name: "Da Dupla", destination: "fomos" }), 201);
    expect((await state("bia", "primeira-mesa")).unlockedAt).not.toBeNull();
  });

  it("almas gêmeas: 10 notas iguais destravam para os dois", async () => {
    for (let i = 0; i < 10; i++) {
      const place = (await api.ok(await api.request("POST", "/v1/restaurants", t.ana!, { name: `Igual ${i}`, destination: "quero-ir" }), 201)).id;
      await api.ok(await api.request("PUT", `/v1/restaurants/${place}/rating`, t.ana!, { food: 4 }));
      await api.ok(await api.request("PUT", `/v1/restaurants/${place}/rating`, t.bia!, { food: 4 }));
    }
    expect((await state("ana", "almas-gemeas")).unlockedAt).not.toBeNull();
    expect((await state("bia", "almas-gemeas")).unlockedAt).not.toBeNull();
  });

  it("maratonista: 3 temporadas da mesma série em até 7 dias sim; em 8 dias não", async () => {
    const show = await title("tv", 7001);
    for (const [season, day] of [[1, "2026-11-01"], [2, "2026-11-04"], [3, "2026-11-08"]] as const) {
      await api.ok(await api.request("POST", `/v1/titles/${show}/logs`, t.duda!, { watchedOn: day, seasonNumber: season }), 201);
    }
    expect((await state("duda", "maratonista")).unlockedAt).toBeNull();
    expect((await state("duda", "maratonista")).progress).toBe(2);
    await api.ok(await api.request("POST", `/v1/titles/${show}/logs`, t.duda!, { watchedOn: "2026-11-07", seasonNumber: 3 }), 201);
    expect((await state("duda", "maratonista")).unlockedAt).not.toBeNull();
  });

  it("crítico exigente exige 20 notas com média até 3", async () => {
    for (let i = 0; i < 20; i++) {
      const place = (await api.ok(await api.request("POST", "/v1/restaurants", t.duda!, { name: `Duro ${i}`, destination: "quero-ir" }), 201)).id;
      await api.ok(await api.request("PUT", `/v1/restaurants/${place}/rating`, t.duda!, { food: i < 10 ? 2 : 4.5 }));
    }
    expect((await state("duda", "critico-exigente")).unlockedAt).toBeNull();
    // 10 × 2 + 10 × 4,5 dá média 3,25; duas notas 0,5 a mais levam a média para 3.
    for (const name of ["Duro final 1", "Duro final 2"]) {
      const extra = (await api.ok(await api.request("POST", "/v1/restaurants", t.duda!, { name, destination: "quero-ir" }), 201)).id;
      await api.ok(await api.request("PUT", `/v1/restaurants/${extra}/rating`, t.duda!, { food: 0.5 }));
    }
    expect((await state("duda", "critico-exigente")).unlockedAt).not.toBeNull();
  });

  it("quem já tinha dados destrava tudo na primeira consulta", async () => {
    // Dados gravados direto no banco, sem passar pelas rotas (como quem usava o app antes).
    const dudaId = "44444444-4444-4444-8444-444444444444";
    await h.test.db.execute(sql`delete from user_achievements where user_id = ${dudaId}`);
    const items = await mine("duda");
    const unlocked = items.filter((item: Json) => item.unlockedAt !== null).map((item: Json) => item.key);
    expect(unlocked).toEqual(expect.arrayContaining(["primeira-sessao", "maratonista", "critico-exigente"]));
  });

  it("perfil público mostra as ganhas, menos as do casal", async () => {
    const items = (await api.ok(await api.request("GET", "/v1/profiles/ana/achievements", t.caio!))).items as Json[];
    const keys = items.map((item) => item.key);
    expect(keys).toContain("primeira-mesa");
    expect(keys).not.toContain("primeiro-encontro");
    expect(keys).not.toContain("almas-gemeas");
  });

  it("marcar como vista só aceita chaves do catálogo", async () => {
    expect((await api.request("POST", "/v1/me/achievements/seen", t.ana!, { keys: ["inventada"] })).status).toBe(400);
  });
});

describe("falha nas conquistas", () => {
  it("não derruba a ação de quem registrou", async () => {
    const other = await createTestHarness();
    try {
      const o = client(other);
      const tokens = await setupCouple(other, [["55555555-5555-4555-8555-555555555555", "eva"]], null);
      await other.test.db.execute(sql`drop table user_achievements cascade`);
      const created = await o.request("POST", "/v1/restaurants", tokens.eva!, { name: "Sem Conquista", destination: "fomos" });
      expect(created.status).toBe(201);
    } finally {
      await other.close();
    }
  });
});
