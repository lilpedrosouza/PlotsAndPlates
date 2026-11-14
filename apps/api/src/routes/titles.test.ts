import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type TestHarness, createTestHarness } from "../testing";

const ANA = "11111111-1111-4111-8111-111111111111";

let h: TestHarness;
let ana: string;

// biome-ignore lint/suspicious/noExplicitAny: corpo de resposta em teste
const bodyOf = async (response: Response): Promise<any> => response.json();
const request = (method: string, path: string, token?: string, body?: unknown) =>
  h.app.request(path, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

beforeAll(async () => {
  h = await createTestHarness();
  ana = await h.signIn(ANA);
});

afterAll(async () => {
  await h.close();
});

describe("busca no TMDB", () => {
  it("exige login", async () => {
    expect((await request("GET", "/v1/tmdb/search?q=chuva")).status).toBe(401);
  });

  it("recusa busca vazia", async () => {
    expect((await request("GET", "/v1/tmdb/search?q=", ana)).status).toBe(400);
  });

  it("devolve filmes e séries", async () => {
    const body = await bodyOf(await request("GET", "/v1/tmdb/search?q=chuva", ana));
    expect(body.results).toEqual([
      { tmdbType: "movie", tmdbId: 9001, title: "A Chuva de Sábado", year: 2021, posterPath: null, kind: "filme" },
    ]);
  });
});

describe("títulos", () => {
  let showId: string;

  it("abrir pelo id do TMDB grava no catálogo e devolve sempre o mesmo id", async () => {
    const first = await bodyOf(await request("GET", "/v1/titles/by-tmdb/tv/7001", ana));
    const second = await bodyOf(await request("GET", "/v1/titles/by-tmdb/tv/7001", ana));
    expect(first.id).toBe(second.id);
    showId = first.id;
  });

  it("tipo inválido ou título inexistente no TMDB", async () => {
    expect((await request("GET", "/v1/titles/by-tmdb/book/1", ana)).status).toBe(400);
    expect((await request("GET", "/v1/titles/by-tmdb/movie/123456", ana)).status).toBe(404);
  });

  it("página do título traz temporadas, onde assistir e nenhuma nota ainda", async () => {
    const detail = await bodyOf(await request("GET", `/v1/titles/${showId}`, ana));
    expect(detail).toMatchObject({
      title: "Casa de Vidro",
      kind: "serie",
      seasonCount: 3,
      directors: ["Beatriz Lago"],
      myRating: null,
      seasonSuggestion: null,
      inWatchlist: false,
      favorite: false,
      logs: [],
    });
    expect(detail.seasons.map((season: { number: number }) => season.number)).toEqual([1, 2, 3]);
    expect(detail.providers.flatrate[0].name).toBe("Netflix");
  });

  it("dá para trocar o tipo", async () => {
    const response = await request("PATCH", `/v1/titles/${showId}/kind`, ana, { kind: "especial" });
    expect(response.status).toBe(200);
    expect((await bodyOf(response)).kind).toBe("especial");
    expect((await request("PATCH", `/v1/titles/${showId}/kind`, ana, { kind: "livro" })).status).toBe(400);
  });

  it("título que não existe no PAP", async () => {
    expect((await request("GET", "/v1/titles/9f0e8d7c-6b5a-4c3d-8e2f-1a0b9c8d7e6f", ana)).status).toBe(404);
  });
});
