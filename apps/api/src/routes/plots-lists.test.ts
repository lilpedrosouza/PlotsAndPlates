import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type TestHarness, createTestHarness } from "../testing";

const ANA = "11111111-1111-4111-8111-111111111111";
const BIA = "22222222-2222-4222-8222-222222222222";

let h: TestHarness;
let ana: string;
let bia: string;
const ids: Record<string, string> = {};

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
  await ok(await request("POST", "/v1/me/profile", ana, { username: "ana", displayName: "Ana" }), 201);
  await ok(await request("PATCH", "/v1/me/profile", ana, { streamings: ["netflix"] }));
  for (const [key, path] of [
    ["chuva", "movie/9001"],
    ["sal", "movie/9002"],
    ["trem", "movie/9003"],
    ["casa", "tv/7001"],
    ["lamina", "tv/7002"],
  ] as const) {
    ids[key] = (await ok(await request("GET", `/v1/titles/by-tmdb/${path}`, ana))).id;
  }
});

afterAll(async () => {
  await h.close();
});

describe("quero ver", () => {
  it("guarda, mostra no detalhe e destaca o que está no streaming do perfil", async () => {
    for (const key of ["chuva", "sal", "trem", "casa"]) await ok(await request("PUT", `/v1/titles/${ids[key]}/watchlist`, ana, {}));
    expect((await ok(await request("GET", `/v1/titles/${ids.chuva}`, ana))).inWatchlist).toBe(true);
    const all = await ok(await request("GET", "/v1/watchlist", ana));
    expect(all.items).toHaveLength(4);
    const chuva = all.items.find((item: { title: { id: string } }) => item.title.id === ids.chuva);
    expect(chuva.onMyStreamings.map((provider: { name: string }) => provider.name)).toEqual(["Netflix"]);
  });

  it("só nos meus streamings", async () => {
    const mine = await ok(await request("GET", "/v1/watchlist?onlyMine=true", ana));
    expect(mine.items.map((item: { title: { id: string } }) => item.title.id).sort()).toEqual([ids.chuva, ids.casa].sort());
  });

  it("filtra por tipo e ordena pelo título", async () => {
    const docs = await ok(await request("GET", "/v1/watchlist?kind=documentario", ana));
    expect(docs.items.map((item: { title: { id: string } }) => item.title.id)).toEqual([ids.sal]);
    const sorted = await ok(await request("GET", "/v1/watchlist?sort=titulo", ana));
    expect(sorted.items.map((item: { title: { title: string } }) => item.title.title)).toEqual([
      "A Chuva de Sábado",
      "Casa de Vidro",
      "Mar de Sal",
      "O Último Trem",
    ]);
  });

  it("a lista dos outros não aparece", async () => {
    expect((await ok(await request("GET", "/v1/watchlist", bia))).items).toHaveLength(0);
  });

  it("Assistimos! registra e tira da lista", async () => {
    const body = await ok(await request("POST", `/v1/titles/${ids.trem}/assistimos`, ana, { watchedOn: "2026-11-10", rating: 4 }), 201);
    expect(body.log).toMatchObject({ rating: 4, watchedOn: "2026-11-10" });
    const after = await ok(await request("GET", "/v1/watchlist", ana));
    expect(after.items.map((item: { title: { id: string } }) => item.title.id)).not.toContain(ids.trem);
    expect((await ok(await request("GET", `/v1/titles/${ids.trem}`, ana))).myRating.rating).toBe(4);
  });

  it("Assistimos! fora da lista responde 409", async () => {
    const response = await request("POST", `/v1/titles/${ids.trem}/assistimos`, ana, { watchedOn: "2026-11-10" });
    expect(response.status).toBe(409);
    expect((await bodyOf(response)).error.code).toBe("not_in_watchlist");
  });

  it("tira da lista sem assistir", async () => {
    expect((await request("DELETE", `/v1/titles/${ids.sal}/watchlist`, ana)).status).toBe(204);
    expect((await ok(await request("GET", `/v1/titles/${ids.sal}`, ana))).inWatchlist).toBe(false);
  });
});

describe("Top 4", () => {
  it("guarda na ordem escolhida", async () => {
    const body = await ok(await request("PUT", "/v1/me/favorites", ana, { titleIds: [ids.casa, ids.chuva, ids.lamina] }));
    expect(body.titles.map((title: { id: string }) => title.id)).toEqual([ids.casa, ids.chuva, ids.lamina]);
    expect((await ok(await request("GET", `/v1/titles/${ids.chuva}`, ana))).favorite).toBe(true);
    const again = await ok(await request("PUT", "/v1/me/favorites", ana, { titleIds: [ids.lamina, ids.casa] }));
    expect(again.titles.map((title: { id: string }) => title.id)).toEqual([ids.lamina, ids.casa]);
  });

  it("recusa 5 títulos, repetidos ou inexistentes", async () => {
    const five = [ids.casa, ids.chuva, ids.lamina, ids.sal, ids.trem];
    expect((await request("PUT", "/v1/me/favorites", ana, { titleIds: five })).status).toBe(400);
    expect((await request("PUT", "/v1/me/favorites", ana, { titleIds: [ids.casa, ids.casa] })).status).toBe(400);
    expect((await request("PUT", "/v1/me/favorites", ana, { titleIds: ["9f0e8d7c-6b5a-4c3d-8e2f-1a0b9c8d7e6f"] })).status).toBe(400);
  });
});

describe("listas", () => {
  let rain: string;
  let secret: string;

  it("cria, adiciona itens e mostra a capa com os pôsteres", async () => {
    rain = (await ok(await request("POST", "/v1/lists", ana, { name: "Dia de chuva", description: "Pra ver no sofá" }), 201)).id;
    secret = (await ok(await request("POST", "/v1/lists", ana, { name: "Só nossa", isPrivate: true }), 201)).id;
    for (const key of ["chuva", "casa", "lamina"]) await ok(await request("POST", `/v1/lists/${rain}/items`, ana, { titleId: ids[key] }), 201);
    const lists = await ok(await request("GET", "/v1/lists", ana));
    expect(lists.lists.find((list: { id: string }) => list.id === rain)).toMatchObject({ name: "Dia de chuva", itemCount: 3 });
    const detail = await ok(await request("GET", `/v1/titles/${ids.chuva}`, ana));
    expect(detail.lists.find((list: { id: string }) => list.id === rain).hasTitle).toBe(true);
  });

  it("item repetido responde 409", async () => {
    expect((await request("POST", `/v1/lists/${rain}/items`, ana, { titleId: ids.chuva })).status).toBe(409);
  });

  it("reordena os itens", async () => {
    const before = await ok(await request("GET", `/v1/lists/${rain}`, ana));
    const reversed = [...before.items].reverse().map((item: { id: string }) => item.id);
    await ok(await request("PUT", `/v1/lists/${rain}/order`, ana, { itemIds: reversed }));
    const after = await ok(await request("GET", `/v1/lists/${rain}`, ana));
    expect(after.items.map((item: { id: string }) => item.id)).toEqual(reversed);
    expect((await request("PUT", `/v1/lists/${rain}/order`, ana, { itemIds: reversed.slice(1) })).status).toBe(400);
  });

  it("lista privada não existe para os outros; a pública só o dono edita", async () => {
    expect((await request("GET", `/v1/lists/${secret}`, bia)).status).toBe(404);
    const open = await ok(await request("GET", `/v1/lists/${rain}`, bia));
    expect(open.isMine).toBe(false);
    expect((await request("PATCH", `/v1/lists/${rain}`, bia, { name: "Da Bia" })).status).toBe(403);
    expect((await request("POST", `/v1/lists/${rain}/items`, bia, { titleId: ids.sal })).status).toBe(403);
  });

  it("tira item e apaga a lista com os itens", async () => {
    const detail = await ok(await request("GET", `/v1/lists/${rain}`, ana));
    expect((await request("DELETE", `/v1/lists/${rain}/items/${detail.items[0].id}`, ana)).status).toBe(204);
    expect((await ok(await request("GET", `/v1/lists/${rain}`, ana))).items).toHaveLength(2);
    expect((await request("DELETE", `/v1/lists/${rain}`, ana)).status).toBe(204);
    expect((await request("GET", `/v1/lists/${rain}`, ana)).status).toBe(404);
  });
});
