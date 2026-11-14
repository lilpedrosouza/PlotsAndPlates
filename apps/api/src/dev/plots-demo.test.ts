import { customLists, favoriteTitles, watchLogs } from "@pap/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createCatalog } from "../tmdb/catalog";
import { createTmdbClient } from "../tmdb/client";
import { tmdbFakeFetch } from "../tmdb/fixtures";
import { type TestHarness, createTestHarness } from "../testing";
import { seedPlotsDemo } from "./plots-demo";

const ANA = "11111111-1111-4111-8111-111111111111";
const BIA = "22222222-2222-4222-8222-222222222222";

let h: TestHarness;

beforeAll(async () => {
  h = await createTestHarness();
  await h.signIn(ANA);
  await h.signIn(BIA);
});

afterAll(async () => {
  await h.close();
});

describe("dados de exemplo de Plots", () => {
  it("criam filme e temporadas no diário, uma lista e o Top 4 da Ana; rodar de novo não duplica", async () => {
    const catalog = createCatalog({ db: h.test.db, client: createTmdbClient({ token: "x", fetch: tmdbFakeFetch().fetch }) });
    await seedPlotsDemo(h.test.db, catalog, { ana: ANA, bia: BIA });
    await seedPlotsDemo(h.test.db, catalog, { ana: ANA, bia: BIA });
    const logs = await h.test.db.select().from(watchLogs).where(eq(watchLogs.userId, ANA));
    expect(logs.some((log) => log.seasonNumber === null)).toBe(true);
    expect(logs.filter((log) => log.seasonNumber !== null).length).toBeGreaterThanOrEqual(2);
    expect(await h.test.db.$count(customLists, eq(customLists.ownerId, ANA))).toBe(1);
    expect(await h.test.db.$count(favoriteTitles, eq(favoriteTitles.userId, ANA))).toBe(4);
  });
});
