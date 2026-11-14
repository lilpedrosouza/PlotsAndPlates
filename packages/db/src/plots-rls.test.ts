import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withUser } from "./client";
import {
  customLists,
  favoriteTitles,
  listItems,
  plotsWatchlist,
  profiles,
  seasonRatings,
  seasons,
  titleRatings,
  titles,
  watchLogs,
} from "./schema";
import { type TestDb, createTestDb } from "./testing";

const ANA = "11111111-1111-4111-8111-111111111111";
const BIA = "22222222-2222-4222-8222-222222222222";

let test: TestDb;
let movie: string;
let series: string;

const asAna = <T>(fn: Parameters<typeof withUser<T>>[2]) => withUser(test.db, { sub: ANA }, fn);
const asBia = <T>(fn: Parameters<typeof withUser<T>>[2]) => withUser(test.db, { sub: BIA }, fn);
const rowsOf = <T>(result: unknown) => (result as { rows: T[] }).rows;

beforeAll(async () => {
  test = await createTestDb();
  for (const [id, username] of [
    [ANA, "ana"],
    [BIA, "bia"],
  ] as const) {
    await test.createAuthUser(id);
    await withUser(test.db, { sub: id }, (tx) => tx.insert(profiles).values({ id, username, displayName: username }));
  }
  // O catálogo é gravado pela API como dona das tabelas (sem trocar de papel).
  const [m] = await test.db.insert(titles).values({ tmdbType: "movie", tmdbId: 1, kind: "filme", title: "Filme" }).returning();
  const [s] = await test.db.insert(titles).values({ tmdbType: "tv", tmdbId: 2, kind: "serie", title: "Série", seasonCount: 2 }).returning();
  movie = m!.id;
  series = s!.id;
  await test.db.insert(seasons).values([
    { titleId: series, number: 1, name: "Temporada 1" },
    { titleId: series, number: 2, name: "Temporada 2" },
  ]);
});

afterAll(async () => {
  await test.close();
});

describe("RLS das tabelas de Plots", () => {
  it("está ligada em todas as tabelas", async () => {
    const names = ["titles", "seasons", "watch_logs", "title_ratings", "season_ratings", "watchlist", "custom_lists", "list_items", "favorite_titles"];
    const rows = rowsOf<{ relname: string; relrowsecurity: boolean }>(
      await test.db.execute(sql`select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'`),
    );
    const enabled = new Map(rows.map((row) => [row.relname, row.relrowsecurity]));
    for (const name of names) expect(enabled.get(name), name).toBe(true);
  });

  it("qualquer pessoa logada lê o catálogo, mas não grava nele", async () => {
    expect(await asBia((tx) => tx.select().from(titles))).toHaveLength(2);
    expect(await asBia((tx) => tx.select().from(seasons))).toHaveLength(2);
    await expect(asBia((tx) => tx.insert(titles).values({ tmdbType: "movie", tmdbId: 9, kind: "filme", title: "X" }))).rejects.toThrow();
  });

  it("registro privado só o dono vê; o público todos veem", async () => {
    await asAna((tx) =>
      tx.insert(watchLogs).values([
        { userId: ANA, titleId: movie, watchedOn: "2026-11-01", rating: "4.5", isPrivate: true },
        { userId: ANA, titleId: series, seasonNumber: 1, watchedOn: "2026-11-02", rating: "4" },
      ]),
    );
    const seenByBia = await asBia((tx) => tx.select().from(watchLogs));
    expect(seenByBia.map((log) => log.titleId)).toEqual([series]);
    expect(await asAna((tx) => tx.select().from(watchLogs))).toHaveLength(2);
  });

  it("ninguém registra em nome de outra pessoa", async () => {
    await expect(asBia((tx) => tx.insert(watchLogs).values({ userId: ANA, titleId: movie, watchedOn: "2026-11-01" }))).rejects.toThrow();
  });

  it("notas: privada escondida, pública visível", async () => {
    await asAna((tx) => tx.insert(titleRatings).values({ userId: ANA, titleId: movie, rating: "4.5", isPrivate: true }));
    await asAna((tx) => tx.insert(seasonRatings).values({ userId: ANA, titleId: series, seasonNumber: 1, rating: "4" }));
    expect(await asBia((tx) => tx.select().from(titleRatings))).toHaveLength(0);
    expect(await asBia((tx) => tx.select().from(seasonRatings))).toHaveLength(1);
  });

  it("quero ver é só do dono", async () => {
    await asAna((tx) => tx.insert(plotsWatchlist).values({ userId: ANA, titleId: movie }));
    expect(await asBia((tx) => tx.select().from(plotsWatchlist))).toHaveLength(0);
  });

  it("lista privada e seus itens ficam escondidos; a pública aparece", async () => {
    const [secret] = await asAna((tx) => tx.insert(customLists).values({ ownerId: ANA, name: "Segredo", isPrivate: true }).returning());
    const [open] = await asAna((tx) => tx.insert(customLists).values({ ownerId: ANA, name: "Chuva" }).returning());
    await asAna((tx) =>
      tx.insert(listItems).values([
        { listId: secret!.id, titleId: movie, position: 0 },
        { listId: open!.id, titleId: series, position: 0 },
      ]),
    );
    expect((await asBia((tx) => tx.select().from(customLists))).map((list) => list.name)).toEqual(["Chuva"]);
    expect(await asBia((tx) => tx.select().from(listItems))).toHaveLength(1);
    await expect(asBia((tx) => tx.insert(listItems).values({ listId: open!.id, titleId: movie, position: 1 }))).rejects.toThrow();
  });

  it("favoritos alheios aparecem; posição vai de 1 a 4", async () => {
    await asAna((tx) => tx.insert(favoriteTitles).values({ userId: ANA, titleId: movie, position: 1 }));
    expect(await asBia((tx) => tx.select().from(favoriteTitles))).toHaveLength(1);
    await expect(asAna((tx) => tx.insert(favoriteTitles).values({ userId: ANA, titleId: series, position: 5 }))).rejects.toThrow();
  });

  it("anon não lê o catálogo", async () => {
    await expect(
      test.db.transaction(async (tx) => {
        await tx.execute(sql`set local role anon`);
        return tx.select().from(titles);
      }),
    ).rejects.toThrow();
  });
});
