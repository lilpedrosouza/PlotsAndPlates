import { restaurants } from "@pap/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type TestHarness, createTestHarness } from "../testing";
import { seedPlatesDemo } from "./plates-demo";

const ANA = "11111111-1111-4111-8111-111111111111";
const BIA = "22222222-2222-4222-8222-222222222222";

let h: TestHarness;
let ana: string;

beforeAll(async () => {
  h = await createTestHarness();
  ana = await h.signIn(ANA);
  await h.signIn(BIA);
});

afterAll(async () => {
  await h.close();
});

describe("dados de exemplo de Plates", () => {
  it("criam 6 restaurantes no caderno da Ana, com notas e quero ir", async () => {
    await seedPlatesDemo(h.test.db, { ana: ANA, bia: BIA });
    const response = await h.app.request("/v1/restaurants?limit=60", { headers: { authorization: `Bearer ${ana}` } });
    const body = (await response.json()) as { items: { myOverall: number | null; wishlist: unknown }[] };
    expect(body.items).toHaveLength(6);
    expect(body.items.filter((item) => item.wishlist !== null)).toHaveLength(2);
    expect(body.items.filter((item) => item.myOverall !== null).length).toBeGreaterThanOrEqual(4);
  });

  it("rodar de novo não duplica", async () => {
    await seedPlatesDemo(h.test.db, { ana: ANA, bia: BIA });
    expect(await h.test.db.$count(restaurants)).toBe(6);
  });
});
