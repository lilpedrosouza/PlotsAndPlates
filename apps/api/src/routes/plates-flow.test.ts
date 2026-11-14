import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type TestHarness, createTestHarness } from "../testing";

const ANA = "11111111-1111-4111-8111-111111111111";
const BIA = "22222222-2222-4222-8222-222222222222";

let h: TestHarness;
let ana: string;
let bia: string;
let restaurant: string;
let otherRestaurant: string;
let bolinho: string;
let pudim: string;

// biome-ignore lint/suspicious/noExplicitAny: corpo de resposta em teste
const bodyOf = async (response: Response): Promise<any> => response.json();

const request = (method: string, path: string, token: string, body?: unknown) =>
  h.app.request(path, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

async function ok(response: Response, status = 200) {
  const body = await bodyOf(response);
  expect(response.status, JSON.stringify(body)).toBe(status);
  return body;
}

beforeAll(async () => {
  h = await createTestHarness();
  ana = await h.signIn(ANA);
  bia = await h.signIn(BIA);
  restaurant = (await ok(await request("POST", "/v1/restaurants", ana, { name: "Bar do Zé", destination: "fomos" }), 201)).id;
  otherRestaurant = (await ok(await request("POST", "/v1/restaurants", ana, { name: "Outro", destination: "fomos" }), 201))
    .id;
  bolinho = (await ok(await request("POST", `/v1/restaurants/${restaurant}/dishes`, ana, { name: "Bolinho", category: "entrada" }), 201)).id;
  pudim = (await ok(await request("POST", `/v1/restaurants/${restaurant}/dishes`, ana, { name: "Pudim", category: "sobremesa" }), 201)).id;
});

afterAll(async () => {
  await h.close();
});

describe("pratos", () => {
  it("quem não cadastrou o restaurante não cria prato", async () => {
    const response = await request("POST", `/v1/restaurants/${restaurant}/dishes`, bia, { name: "Intruso" });
    expect(response.status).toBe(403);
  });

  it("quem cadastrou edita o prato", async () => {
    const body = await ok(await request("PATCH", `/v1/dishes/${bolinho}`, ana, { priceCents: 3200 }));
    expect(body).toMatchObject({ name: "Bolinho", priceCents: 3200, category: "entrada", canEdit: true });
  });

  it("quem não cadastrou não edita nem apaga o prato", async () => {
    expect((await request("PATCH", `/v1/dishes/${bolinho}`, bia, { name: "X" })).status).toBe(403);
    expect((await request("DELETE", `/v1/dishes/${bolinho}`, bia)).status).toBe(403);
  });

  it("apagar o prato apaga a foto e a miniatura", async () => {
    const dish = await ok(
      await request("POST", `/v1/restaurants/${restaurant}/dishes`, ana, {
        name: "Temporário",
        photoPath: `dishes/${ANA}/t.webp`,
      }),
      201,
    );
    expect((await request("DELETE", `/v1/dishes/${dish.id}`, ana)).status).toBe(204);
    expect(h.removed).toEqual(expect.arrayContaining([`dishes/${ANA}/t.webp`, `dishes/${ANA}/t.thumb.webp`]));
  });
});

describe("visitas", () => {
  it("registra a visita com pratos pedidos e fotos", async () => {
    const visit = await ok(
      await request("POST", `/v1/restaurants/${restaurant}/visits`, ana, {
        visitedOn: "2026-10-31",
        occasion: "aniversário",
        amountCents: 18000,
        dishIds: [bolinho, pudim],
        photoPaths: [`visits/${ANA}/v1.webp`],
      }),
      201,
    );
    expect(visit).toMatchObject({ visitedOn: "2026-10-31", occasion: "aniversário", amountCents: 18000 });
    expect(visit.dishIds.sort()).toEqual([bolinho, pudim].sort());
    expect(visit.photos[0].thumbUrl).toContain(`visits/${ANA}/v1.thumb.webp`);
  });

  it("recusa prato de outro restaurante", async () => {
    const response = await request("POST", `/v1/restaurants/${otherRestaurant}/visits`, ana, {
      visitedOn: "2026-10-31",
      dishIds: [bolinho],
    });
    expect(response.status).toBe(400);
  });

  it("qualquer pessoa registra a própria visita, mas não mexe na dos outros", async () => {
    const visit = await ok(
      await request("POST", `/v1/restaurants/${restaurant}/visits`, bia, { visitedOn: "2026-11-01", dishIds: [pudim] }),
      201,
    );
    expect((await request("DELETE", `/v1/visits/${visit.id}`, ana)).status).toBe(404);
    const updated = await ok(await request("PATCH", `/v1/visits/${visit.id}`, bia, { occasion: "almoço", dishIds: [] }));
    expect(updated).toMatchObject({ occasion: "almoço", dishIds: [] });
  });

  it("apagar a visita apaga as fotos dela", async () => {
    const visit = await ok(
      await request("POST", `/v1/restaurants/${restaurant}/visits`, ana, {
        visitedOn: "2026-11-02",
        photoPaths: [`visits/${ANA}/apagar.webp`],
      }),
      201,
    );
    expect((await request("DELETE", `/v1/visits/${visit.id}`, ana)).status).toBe(204);
    expect(h.removed).toEqual(expect.arrayContaining([`visits/${ANA}/apagar.webp`, `visits/${ANA}/apagar.thumb.webp`]));
  });
});

describe("avaliações", () => {
  it("nota geral é a média dos critérios, empate para cima, e PUT atualiza em vez de duplicar", async () => {
    await ok(await request("PUT", `/v1/restaurants/${restaurant}/rating`, ana, { food: 3 }));
    const body = await ok(
      await request("PUT", `/v1/restaurants/${restaurant}/rating`, ana, { food: 4, service: 4.5, review: "Bom demais" }),
    );
    expect(body).toMatchObject({ food: 4, service: 4.5, ambiance: null, overall: 4.5, review: "Bom demais", isPrivate: false });
    const detail = await ok(await request("GET", `/v1/restaurants/${restaurant}`, ana));
    expect(detail.myOverall).toBe(4.5);
  });

  it("avaliação sem critério é recusada", async () => {
    expect((await request("PUT", `/v1/restaurants/${restaurant}/rating`, ana, { review: "só texto" })).status).toBe(400);
  });

  it("quem não cadastrou avalia os pratos; o ranking dela usa só a nota dela", async () => {
    await ok(await request("PUT", `/v1/dishes/${bolinho}/rating`, ana, { rating: 2, isPrivate: false }));
    await ok(await request("PUT", `/v1/dishes/${pudim}/rating`, ana, { rating: 5, isPrivate: true }));
    const mine = await ok(await request("PUT", `/v1/dishes/${bolinho}/rating`, bia, { rating: 4.5, wouldOrderAgain: true }));
    expect(mine).toMatchObject({ rating: 4.5, wouldOrderAgain: true });

    const seenByBia = await ok(await request("GET", `/v1/restaurants/${restaurant}`, bia));
    const byName = Object.fromEntries(seenByBia.dishes.map((dish: { name: string }) => [dish.name, dish]));
    expect(byName.Bolinho).toMatchObject({ score: 4.5, ratingCount: 1, wouldOrderAgainShare: 1, myRating: { rating: 4.5 } });
    expect(byName.Pudim).toMatchObject({ score: null, ratingCount: 0, myRating: null });
    expect(seenByBia.dishes[0].name).toBe("Bolinho");

    const seenByAna = await ok(await request("GET", `/v1/restaurants/${restaurant}`, ana));
    expect(seenByAna.dishes.map((dish: { name: string }) => dish.name)).toEqual(["Pudim", "Bolinho"]);
  });

  it("apaga a própria nota", async () => {
    expect((await request("DELETE", `/v1/dishes/${pudim}/rating`, ana)).status).toBe(204);
    const detail = await ok(await request("GET", `/v1/restaurants/${restaurant}`, ana));
    expect(detail.dishes.find((dish: { id: string }) => dish.id === pudim).myRating).toBeNull();
  });
});

describe("quero ir e Fomos!", () => {
  let wanted: string;

  beforeAll(async () => {
    wanted = (
      await ok(
        await request("POST", "/v1/restaurants", ana, {
          name: "Lista de Desejos",
          destination: "quero-ir",
          wishlist: { priority: "baixa" },
        }),
        201,
      )
    ).id;
  });

  it("altera a prioridade e o motivo", async () => {
    const body = await ok(await request("PUT", `/v1/restaurants/${wanted}/wishlist`, ana, { priority: "alta", reason: "fama" }));
    expect(body).toMatchObject({ priority: "alta", reason: "fama" });
  });

  it("Fomos! cria a visita e tira o restaurante do quero ir", async () => {
    const body = await ok(await request("POST", `/v1/restaurants/${wanted}/fomos`, ana, {}), 201);
    expect(body.visit.restaurantId).toBe(wanted);
    const list = await ok(await request("GET", "/v1/restaurants?status=quero-ir", ana));
    expect(list.items.map((item: { id: string }) => item.id)).not.toContain(wanted);
    const visited = await ok(await request("GET", "/v1/restaurants?status=fomos", ana));
    expect(visited.items.map((item: { id: string }) => item.id)).toContain(wanted);
  });

  it("Fomos! sem estar no quero ir responde 409", async () => {
    const response = await request("POST", `/v1/restaurants/${wanted}/fomos`, ana, {});
    expect(response.status).toBe(409);
    expect((await bodyOf(response)).error.code).toBe("not_in_wishlist");
  });

  it("tira do quero ir sem visitar", async () => {
    const other = (
      await ok(await request("POST", "/v1/restaurants", bia, { name: "Talvez", destination: "quero-ir" }), 201)
    ).id;
    expect((await request("DELETE", `/v1/restaurants/${other}/wishlist`, bia)).status).toBe(204);
    const list = await ok(await request("GET", "/v1/restaurants?status=quero-ir", bia));
    expect(list.items.map((item: { id: string }) => item.id)).not.toContain(other);
  });
});
