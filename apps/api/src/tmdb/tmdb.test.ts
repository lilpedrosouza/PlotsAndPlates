import { type TestDb, createTestDb } from "@pap/db/testing";
import { seasons, titles } from "@pap/db";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { fakeFetch, json } from "../places/fixtures";
import { createCatalog } from "./catalog";
import { TmdbUnavailable, createTmdbClient } from "./client";
import { TMDB_ROUTES, tmdbFakeFetch } from "./fixtures";

let test: TestDb;
let clock: Date;
const now = () => clock;
const DAY = 24 * 60 * 60 * 1000;

// Um banco para o arquivo todo; o catálogo é esvaziado antes de cada teste.
beforeAll(async () => {
  test = await createTestDb();
});

beforeEach(async () => {
  await test.db.execute(sql`truncate table titles cascade`);
  clock = new Date("2026-11-14T12:00:00Z");
});

afterAll(async () => {
  await test.close();
});

function setup(routes = TMDB_ROUTES) {
  const fake = fakeFetch(routes);
  const client = createTmdbClient({ token: "tok", fetch: fake.fetch });
  const catalog = createCatalog({ db: test.db, client, now });
  return { catalog, calls: fake.calls };
}

describe("busca", () => {
  it("traz filmes e séries, sem pessoas, com o tipo sugerido", async () => {
    const { catalog, calls } = setup();
    const results = await catalog.search("*", 1);
    expect(results.map((item) => item.tmdbId)).toEqual([9001, 7001, 9002, 7002, 9003]);
    expect(results.find((item) => item.tmdbId === 9002)?.kind).toBe("documentario");
    expect(results.find((item) => item.tmdbId === 7002)?.kind).toBe("anime");
    expect(new Headers(calls[0]?.init?.headers).get("authorization")).toBe("Bearer tok");
    expect(calls[0]?.url).toContain("language=pt-BR");
  });

  it("sem token, avisa que o TMDB não está disponível", async () => {
    const catalog = createCatalog({ db: test.db, client: null, now });
    await expect(catalog.search("chuva", 1)).rejects.toBeInstanceOf(TmdbUnavailable);
  });

  it("com o TMDB recusando (429), avisa que não está disponível", async () => {
    const { catalog } = setup([{ match: "api.themoviedb.org", respond: () => json({}, 429) }]);
    await expect(catalog.search("chuva", 1)).rejects.toBeInstanceOf(TmdbUnavailable);
  });
});

describe("catálogo", () => {
  it("grava o filme com gêneros, direção, elenco e onde assistir no Brasil", async () => {
    const { catalog } = setup();
    const id = await catalog.ensure("movie", 9001);
    const [row] = await test.db.select().from(titles).where(eq(titles.id, id));
    expect(row).toMatchObject({
      kind: "filme",
      title: "A Chuva de Sábado",
      year: 2021,
      runtime: 104,
      genres: ["Drama", "Comédia"],
      credits: { directors: ["Lia Moreira"], cast: [{ name: "Marina Alves", character: "Clara" }, { name: "Tomás Reis", character: "Bento" }] },
    });
    expect(row?.providers?.flatrate).toEqual([{ id: 8, name: "Netflix", logoPath: "/netflix.jpg" }]);
    expect(row?.providers?.rent.map((provider) => provider.id)).toEqual([2]);
  });

  it("grava a série com criação, temporadas (sem especiais vazios) e tipo anime quando for", async () => {
    const { catalog } = setup();
    const show = await catalog.ensure("tv", 7001);
    const rows = await test.db.select().from(seasons).where(eq(seasons.titleId, show));
    expect(rows.map((season) => season.number).sort()).toEqual([1, 2, 3]);
    const [row] = await test.db.select().from(titles).where(eq(titles.id, show));
    expect(row).toMatchObject({ kind: "serie", seasonCount: 3, runtime: 48, credits: { directors: ["Beatriz Lago"] } });
    const anime = await catalog.ensure("tv", 7002);
    const [animeRow] = await test.db.select().from(titles).where(eq(titles.id, anime));
    expect(animeRow?.kind).toBe("anime");
  });

  it("dentro de 30 dias usa o que já tem; depois atualiza", async () => {
    const { catalog, calls } = setup();
    const id = await catalog.ensure("movie", 9001);
    clock = new Date(clock.getTime() + 29 * DAY);
    expect(await catalog.ensure("movie", 9001)).toBe(id);
    expect(calls).toHaveLength(1);
    clock = new Date(clock.getTime() + 2 * DAY);
    expect(await catalog.ensure("movie", 9001)).toBe(id);
    expect(calls).toHaveLength(2);
  });

  it("duas pessoas abrindo o mesmo título ao mesmo tempo não duplicam", async () => {
    const { catalog } = setup();
    const [first, second] = await Promise.all([catalog.ensure("movie", 9003), catalog.ensure("movie", 9003)]);
    expect(first).toBe(second);
    expect(await test.db.$count(titles)).toBe(1);
  });

  it("com o TMDB fora do ar, um título já guardado continua abrindo", async () => {
    const { catalog } = setup();
    const id = await catalog.ensure("movie", 9001);
    clock = new Date(clock.getTime() + 60 * DAY);
    const down = createCatalog({ db: test.db, client: createTmdbClient({ token: "t", fetch: fakeFetch([]).fetch }), now });
    expect(await down.ensure("movie", 9001)).toBe(id);
  });

  it("a troca de tipo feita por alguém sobrevive à atualização", async () => {
    const { catalog } = setup();
    const id = await catalog.ensure("movie", 9001);
    await test.db.update(titles).set({ kind: "especial" }).where(eq(titles.id, id));
    clock = new Date(clock.getTime() + 31 * DAY);
    await catalog.ensure("movie", 9001);
    const [row] = await test.db.select().from(titles).where(eq(titles.id, id));
    expect(row?.kind).toBe("especial");
  });

  it("título que não existe no TMDB", async () => {
    const { catalog } = setup();
    await expect(catalog.ensure("movie", 123456)).rejects.toThrow(/não encontrado/i);
  });
});

describe("cliente", () => {
  it("usa o fetch injetado", async () => {
    const fake = tmdbFakeFetch();
    const client = createTmdbClient({ token: "x", fetch: fake.fetch });
    const movie = await client.movie(9002);
    expect((movie as { title: string }).title).toBe("Mar de Sal");
  });
});

describe("manutenção do catálogo", () => {
  const ANA = "11111111-1111-4111-8111-111111111111";

  it("atualiza só os títulos com mais de 150 dias", async () => {
    const { catalog, calls } = setup();
    const old = await catalog.ensure("movie", 9001);
    clock = new Date(clock.getTime() + 100 * DAY);
    const recent = await catalog.ensure("movie", 9002);
    clock = new Date(clock.getTime() + 60 * DAY);
    const before = calls.length;
    expect(await catalog.refreshOlderThan(150, 10)).toBe(1);
    expect(calls.length - before).toBe(1);
    const [row] = await test.db.select().from(titles).where(eq(titles.id, old));
    expect(row?.fetchedAt.getTime()).toBe(clock.getTime());
    const [other] = await test.db.select().from(titles).where(eq(titles.id, recent));
    expect(other?.fetchedAt.getTime()).toBeLessThan(clock.getTime());
  });

  it("apaga só o que ninguém usa", async () => {
    const { watchLogs, plotsWatchlist } = await import("@pap/db");
    await test.createAuthUser(ANA);
    const { catalog } = setup();
    const unused = await catalog.ensure("movie", 9001);
    const inDiary = await catalog.ensure("movie", 9002);
    const wanted = await catalog.ensure("movie", 9003);
    await test.db.insert(watchLogs).values({ userId: ANA, titleId: inDiary, watchedOn: "2026-01-01" });
    await test.db.insert(plotsWatchlist).values({ userId: ANA, titleId: wanted });
    clock = new Date(clock.getTime() + 200 * DAY);
    expect(await catalog.pruneUnused(150)).toBe(1);
    const left = (await test.db.select({ id: titles.id }).from(titles)).map((row) => row.id);
    expect(left).not.toContain(unused);
    expect(left).toEqual(expect.arrayContaining([inDiary, wanted]));
  });
});
