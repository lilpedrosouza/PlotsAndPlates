import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type TestHarness, createTestHarness } from "../testing";

const ANA = "11111111-1111-4111-8111-111111111111";
const SESSION = "6f1c1b7e-8a0f-4c51-9d55-3b0f0c3d2e11";

// biome-ignore lint/suspicious/noExplicitAny: corpo de resposta em teste
const bodyOf = async (response: Response): Promise<any> => response.json();

let h: TestHarness;
let token: string;

const get = (path: string, auth?: string) =>
  h.app.request(path, { headers: auth ? { authorization: `Bearer ${auth}` } : {} });
const post = (path: string, auth: string, body: unknown) =>
  h.app.request(path, {
    method: "POST",
    headers: { authorization: `Bearer ${auth}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeAll(async () => {
  h = await createTestHarness();
  token = await h.signIn(ANA);
});

afterAll(async () => {
  await h.close();
});

describe("rotas de lugares", () => {
  it("exigem login", async () => {
    const response = await get(`/v1/places/autocomplete?q=bar&session=${SESSION}`);
    expect(response.status).toBe(401);
  });

  it("autocomplete recusa busca com uma letra", async () => {
    const response = await get(`/v1/places/autocomplete?q=b&session=${SESSION}`, token);
    expect(response.status).toBe(400);
  });

  it("autocomplete sem chave do Google responde pelo OpenStreetMap", async () => {
    const response = await get(`/v1/places/autocomplete?q=bar%20do%20ze&session=${SESSION}`, token);
    expect(response.status).toBe(200);
    const body = await bodyOf(response);
    expect(body.source).toBe("osm");
    expect(body.suggestions[0].osmRef).toBe("node/1001");
  });

  it("resolve recusa link que não é do Maps", async () => {
    const response = await post("/v1/places/resolve", token, { mapsUrl: "https://exemplo.com/x" });
    expect(response.status).toBe(400);
    expect((await bodyOf(response)).error.code).toBe("invalid_maps_url");
  });

  it("resolve devolve rascunho do OpenStreetMap", async () => {
    const response = await post("/v1/places/resolve", token, { osmRef: "node/1001", query: "Bar do Zé" });
    expect(response.status).toBe(200);
    const body = await bodyOf(response);
    expect(body).toMatchObject({ source: "osm", osmAttribution: true, fields: { name: "Bar do Zé", osmRef: "node/1001" } });
  });

  it("painel do Google sem chave responde 503", async () => {
    const response = await get("/v1/places/ChIJ-bar-do-ze/live", token);
    expect(response.status).toBe(503);
    expect((await bodyOf(response)).error.code).toBe("google_unavailable");
  });

  it("painel do Google tem limite de 10 por minuto", async () => {
    const other = await h.signIn("44444444-4444-4444-8444-444444444444");
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 11; attempt += 1) {
      statuses.push((await get("/v1/places/ChIJ-x/live", other)).status);
    }
    expect(statuses.slice(0, 10).every((status) => status === 503)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});
