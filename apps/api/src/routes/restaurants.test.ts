import { restaurantRatings, withUser } from "@pap/db";
import { todayIso } from "@pap/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type TestHarness, createTestHarness } from "../testing";

const ANA = "11111111-1111-4111-8111-111111111111";
const BIA = "22222222-2222-4222-8222-222222222222";

let h: TestHarness;
let ana: string;
let bia: string;

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

async function create(token: string, body: Record<string, unknown>): Promise<string> {
  const response = await request("POST", "/v1/restaurants", token, { destination: "fomos", ...body });
  expect(response.status, JSON.stringify(await response.clone().json())).toBe(201);
  return (await bodyOf(response)).id;
}

async function rate(userId: string, restaurantId: string, food: string) {
  await withUser(h.test.db, { sub: userId }, (tx) =>
    tx.insert(restaurantRatings).values({ restaurantId, userId, food }),
  );
}

beforeAll(async () => {
  h = await createTestHarness();
  ana = await h.signIn(ANA);
  bia = await h.signIn(BIA);
});

afterAll(async () => {
  await h.close();
});

describe("cadastro", () => {
  it("com destino 'fomos', cria a visita de hoje", async () => {
    const id = await create(ana, { name: "Bar do Zé", city: "São Paulo", neighborhood: "Pinheiros" });
    const detail = await bodyOf(await request("GET", `/v1/restaurants/${id}`, ana));
    expect(detail.visits).toHaveLength(1);
    expect(detail.visits[0].visitedOn).toBe(todayIso());
    expect(detail.visitCount).toBe(1);
    expect(detail.canEdit).toBe(true);
  });

  it("com destino 'quero ir', cria o item com prioridade e motivo", async () => {
    const id = await create(ana, {
      name: "Sushi Leblon",
      destination: "quero-ir",
      wishlist: { reason: "indicação da Bia", priority: "alta" },
    });
    const detail = await bodyOf(await request("GET", `/v1/restaurants/${id}`, ana));
    expect(detail.visits).toHaveLength(0);
    expect(detail.wishlist).toMatchObject({ priority: "alta", reason: "indicação da Bia" });
  });

  it("o mesmo place_id do Google devolve 409 com o id existente", async () => {
    const id = await create(ana, { name: "Cantina Única", googlePlaceId: "ChIJ-unica" });
    const response = await request("POST", "/v1/restaurants", bia, {
      name: "Cantina Única de novo",
      googlePlaceId: "ChIJ-unica",
      destination: "fomos",
    });
    expect(response.status).toBe(409);
    const body = await bodyOf(response);
    expect(body.error.code).toBe("restaurant_exists");
    expect(body.error.fields.id).toBe(id);
  });

  it("recusa capa enviada por outra pessoa", async () => {
    const response = await request("POST", "/v1/restaurants", ana, {
      name: "Capa Alheia",
      destination: "fomos",
      coverPath: `restaurants/${BIA}/foto.webp`,
    });
    expect(response.status).toBe(400);
  });
});

describe("caderno", () => {
  let japones: string;
  let italiano: string;
  let padaria: string;

  beforeAll(async () => {
    const other = await h.signIn("33333333-3333-4333-8333-333333333333");
    japones = await create(other, { name: "Kaiten", cuisines: ["japanese"], city: "Rio de Janeiro", priceLevel: 3 });
    italiano = await create(other, { name: "Nonna", cuisines: ["italian"], neighborhood: "Bixiga", city: "São Paulo" });
    padaria = await create(other, { name: "Padoca", cuisines: ["bakery"], city: "São Paulo", priceLevel: 1 });
    await rate("33333333-3333-4333-8333-333333333333", japones, "5");
    await rate("33333333-3333-4333-8333-333333333333", italiano, "3.5");
    await rate("33333333-3333-4333-8333-333333333333", padaria, "4");
    (globalThis as { other?: string }).other = other;
  });

  const list = async (query: string) => {
    const token = (globalThis as { other?: string }).other!;
    const response = await request("GET", `/v1/restaurants?${query}`, token);
    expect(response.status).toBe(200);
    return bodyOf(response);
  };

  it("mostra só os restaurantes de quem está vendo", async () => {
    const body = await bodyOf(await request("GET", "/v1/restaurants", bia));
    expect(body.items.map((item: { name: string }) => item.name)).not.toContain("Bar do Zé");
  });

  it("filtra por cozinha", async () => {
    const body = await list("cuisine=japanese");
    expect(body.items.map((item: { id: string }) => item.id)).toEqual([japones]);
  });

  it("filtra por bairro ou cidade", async () => {
    expect((await list("area=bixiga")).items.map((item: { id: string }) => item.id)).toEqual([italiano]);
    expect((await list("area=s%C3%A3o%20paulo")).items).toHaveLength(2);
  });

  it("filtra por faixa de preço e nota mínima", async () => {
    expect((await list("price=1")).items.map((item: { id: string }) => item.id)).toEqual([padaria]);
    expect((await list("minRating=4")).items.map((item: { id: string }) => item.id).sort()).toEqual([japones, padaria].sort());
  });

  it("ordena pela nota", async () => {
    const body = await list("sort=nota");
    expect(body.items.map((item: { myOverall: number }) => item.myOverall)).toEqual([5, 4, 3.5]);
  });

  it("pagina sem repetir", async () => {
    const first = await list("sort=nome&limit=2");
    expect(first.items).toHaveLength(2);
    expect(first.nextCursor).toBeTruthy();
    const second = await list(`sort=nome&limit=2&cursor=${encodeURIComponent(first.nextCursor)}`);
    expect(second.items).toHaveLength(1);
    expect(second.nextCursor).toBeNull();
    const ids = [...first.items, ...second.items].map((item: { id: string }) => item.id);
    expect(new Set(ids).size).toBe(3);
  });

  it("pins do mapa trazem só quem tem coordenadas", async () => {
    const token = (globalThis as { other?: string }).other!;
    const id = await create(token, { name: "Com Pin", lat: -23.56, lng: -46.69 });
    const body = await bodyOf(await request("GET", "/v1/restaurants/map", token));
    expect(body.pins).toEqual([{ id, name: "Com Pin", lat: -23.56, lng: -46.69, status: "fomos", myOverall: null }]);
  });
});

describe("edição e exclusão", () => {
  it("quem não cadastrou não edita", async () => {
    const id = await create(ana, { name: "Só da Ana" });
    const response = await request("PATCH", `/v1/restaurants/${id}`, bia, { name: "Da Bia" });
    expect(response.status).toBe(403);
  });

  it("quem cadastrou edita", async () => {
    const id = await create(ana, { name: "Editável" });
    const response = await request("PATCH", `/v1/restaurants/${id}`, ana, { phone: "11 5555-0000", cuisines: ["pizza"] });
    expect(response.status).toBe(200);
    expect(await bodyOf(response)).toMatchObject({ phone: "11 5555-0000", cuisines: ["pizza"] });
  });

  it("restaurante inexistente responde 404", async () => {
    const response = await request("GET", "/v1/restaurants/9f0e8d7c-6b5a-4c3d-8e2f-1a0b9c8d7e6f", ana);
    expect(response.status).toBe(404);
  });

  it("fotos: quem cadastrou adiciona; ao apagar o restaurante, somem foto e miniatura", async () => {
    const id = await create(ana, { name: "Com Fotos", coverPath: `restaurants/${ANA}/capa.webp` });
    const added = await request("POST", `/v1/restaurants/${id}/photos`, ana, { path: `restaurants/${ANA}/extra.webp` });
    expect(added.status).toBe(201);
    expect((await bodyOf(added)).thumbUrl).toContain(`restaurants/${ANA}/extra.thumb.webp`);

    const byBia = await request("POST", `/v1/restaurants/${id}/photos`, bia, { path: `restaurants/${BIA}/x.webp` });
    expect(byBia.status).toBe(403);

    const deleted = await request("DELETE", `/v1/restaurants/${id}`, ana);
    expect(deleted.status).toBe(204);
    expect(h.removed).toEqual(
      expect.arrayContaining([
        `restaurants/${ANA}/capa.webp`,
        `restaurants/${ANA}/capa.thumb.webp`,
        `restaurants/${ANA}/extra.webp`,
        `restaurants/${ANA}/extra.thumb.webp`,
      ]),
    );
  });

  it("quem não cadastrou não apaga", async () => {
    const id = await create(ana, { name: "Não Apaga" });
    expect((await request("DELETE", `/v1/restaurants/${id}`, bia)).status).toBe(403);
  });
});

describe("upload de fotos de Plates", () => {
  it("assina a foto e a miniatura", async () => {
    const response = await request("POST", "/v1/uploads/sign", ana, { kind: "restaurant" });
    expect(response.status).toBe(201);
    const body = await bodyOf(response);
    expect(body.path).toMatch(new RegExp(`^restaurants/${ANA}/[0-9a-f-]+\\.webp$`));
    expect(body.thumbPath).toBe(body.path.replace(".webp", ".thumb.webp"));
    expect(body.thumbToken).toBeTruthy();
  });

  it("avatar continua sem miniatura", async () => {
    const body = await bodyOf(await request("POST", "/v1/uploads/sign", ana, { kind: "avatar" }));
    expect(body.thumbPath).toBeUndefined();
  });
});
