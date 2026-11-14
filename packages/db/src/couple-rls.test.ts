import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withUser } from "./client";
import {
  coupleMembers,
  customLists,
  plotsWatchlist,
  profiles,
  restaurantRatings,
  restaurantWishlist,
  restaurants,
  titles,
  visits,
  watchLogs,
} from "./schema";
import { type TestDb, createTestDb } from "./testing";

const ANA = "11111111-1111-4111-8111-111111111111";
const BIA = "22222222-2222-4222-8222-222222222222";
const CAIO = "33333333-3333-4333-8333-333333333333";

let test: TestDb;
let place: string;
let movie: string;
let together: string;
let alone: string;

const as = <T>(id: string, fn: Parameters<typeof withUser<T>>[2]) => withUser(test.db, { sub: id }, fn);

beforeAll(async () => {
  test = await createTestDb();
  for (const [id, username] of [
    [ANA, "ana"],
    [BIA, "bia"],
    [CAIO, "caio"],
  ] as const) {
    await test.createAuthUser(id);
    await as(id, (tx) => tx.insert(profiles).values({ id, username, displayName: username }));
  }
  // Casal Ana + Bia (gravado pela API, dona das tabelas).
  const couple = "99999999-9999-4999-8999-999999999999";
  await test.db.insert(coupleMembers).values([
    { coupleId: couple, userId: ANA },
    { coupleId: couple, userId: BIA },
  ]);
  const [r] = await as(ANA, (tx) => tx.insert(restaurants).values({ createdBy: ANA, name: "Da Ana" }).returning());
  place = r!.id;
  const [t] = await test.db.insert(titles).values({ tmdbType: "movie", tmdbId: 1, kind: "filme", title: "Filme" }).returning();
  movie = t!.id;
  const [v1] = await as(ANA, (tx) => tx.insert(visits).values({ restaurantId: place, userId: ANA, visitedOn: "2026-11-01", together: true }).returning());
  const [v2] = await as(ANA, (tx) => tx.insert(visits).values({ restaurantId: place, userId: ANA, visitedOn: "2026-11-02" }).returning());
  together = v1!.id;
  alone = v2!.id;
  await as(ANA, (tx) => tx.insert(restaurantRatings).values({ restaurantId: place, userId: ANA, food: "4", isPrivate: true }));
  await as(ANA, (tx) => tx.insert(restaurantWishlist).values({ restaurantId: place, userId: ANA }));
  await as(ANA, (tx) => tx.insert(watchLogs).values({ userId: ANA, titleId: movie, watchedOn: "2026-11-01", rating: "4", isPrivate: true }));
  await as(ANA, (tx) => tx.insert(plotsWatchlist).values({ userId: ANA, titleId: movie }));
  await as(ANA, (tx) => tx.insert(customLists).values({ ownerId: ANA, name: "Segredo", isPrivate: true }));
});

afterAll(async () => {
  await test.close();
});

describe("o par", () => {
  it("partner_of devolve o par e nada para quem não tem", async () => {
    const rows = (await test.db.execute(sql`select public.partner_of(${ANA}::uuid) as a, public.partner_of(${CAIO}::uuid) as c`)) as unknown as {
      rows: { a: string | null; c: string | null }[];
    };
    expect(rows.rows[0]).toEqual({ a: BIA, c: null });
  });

  it("vê a avaliação privada; quem é de fora não vê", async () => {
    expect(await as(BIA, (tx) => tx.select().from(restaurantRatings))).toHaveLength(1);
    expect(await as(CAIO, (tx) => tx.select().from(restaurantRatings))).toHaveLength(0);
    expect(await as(BIA, (tx) => tx.select().from(watchLogs))).toHaveLength(1);
    expect(await as(CAIO, (tx) => tx.select().from(watchLogs))).toHaveLength(0);
    expect(await as(BIA, (tx) => tx.select().from(customLists))).toHaveLength(1);
    expect(await as(CAIO, (tx) => tx.select().from(customLists))).toHaveLength(0);
  });

  it("vê e edita a visita juntos, mas não a que a Ana fez sozinha", async () => {
    const seen = (await as(BIA, (tx) => tx.select().from(visits))).map((visit) => visit.id);
    expect(seen).toEqual([together]);
    const updated = await as(BIA, (tx) => tx.update(visits).set({ occasion: "aniversário" }).where(eq(visits.id, together)).returning());
    expect(updated[0]?.occasion).toBe("aniversário");
    expect(await as(BIA, (tx) => tx.update(visits).set({ occasion: "x" }).where(eq(visits.id, alone)).returning())).toHaveLength(0);
  });

  it("não apaga a visita da Ana nem desmarca o juntos direto (isso é a API que faz)", async () => {
    expect(await as(BIA, (tx) => tx.delete(visits).where(eq(visits.id, together)).returning())).toHaveLength(0);
    await expect(as(BIA, (tx) => tx.update(visits).set({ together: false }).where(eq(visits.id, together)))).rejects.toThrow();
    const [stillThere] = await as(ANA, (tx) => tx.select().from(visits).where(eq(visits.id, together)));
    expect(stillThere?.together).toBe(true);
  });

  it("vê e tira itens das listas de vontade do par", async () => {
    expect(await as(BIA, (tx) => tx.select().from(restaurantWishlist))).toHaveLength(1);
    expect(await as(CAIO, (tx) => tx.select().from(restaurantWishlist))).toHaveLength(0);
    expect(await as(BIA, (tx) => tx.delete(plotsWatchlist).returning())).toHaveLength(1);
  });

  it("edita o restaurante que o par cadastrou; quem é de fora não", async () => {
    expect(await as(BIA, (tx) => tx.update(restaurants).set({ phone: "1" }).where(eq(restaurants.id, place)).returning())).toHaveLength(1);
    expect(await as(CAIO, (tx) => tx.update(restaurants).set({ phone: "2" }).where(eq(restaurants.id, place)).returning())).toHaveLength(0);
  });

  it("ninguém grava casal direto", async () => {
    await expect(as(CAIO, (tx) => tx.insert(coupleMembers).values({ coupleId: ANA, userId: CAIO }))).rejects.toThrow();
  });
});
