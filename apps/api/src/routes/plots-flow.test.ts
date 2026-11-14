import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type TestHarness, createTestHarness } from "../testing";

const ANA = "11111111-1111-4111-8111-111111111111";
const BIA = "22222222-2222-4222-8222-222222222222";

let h: TestHarness;
let ana: string;
let bia: string;
let movie: string;
let show: string;

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
const getDetail = async (id: string, token = ana) => ok(await request("GET", `/v1/titles/${id}`, token));

beforeAll(async () => {
  h = await createTestHarness();
  ana = await h.signIn(ANA);
  bia = await h.signIn(BIA);
  movie = (await ok(await request("GET", "/v1/titles/by-tmdb/movie/9001", ana))).id;
  show = (await ok(await request("GET", "/v1/titles/by-tmdb/tv/7001", ana))).id;
});

afterAll(async () => {
  await h.close();
});

describe("registros de filme", () => {
  it("o registro com nota vira a nota do filme", async () => {
    const log = await ok(await request("POST", `/v1/titles/${movie}/logs`, ana, { watchedOn: "2026-10-02", rating: 4, liked: true }), 201);
    expect(log).toMatchObject({ rating: 4, liked: true, rewatch: false, seasonNumber: null });
    expect((await getDetail(movie)).myRating).toMatchObject({ rating: 4, liked: true });
  });

  it("ver de novo marca reassistido sozinho e a nota passa a ser a mais recente", async () => {
    const log = await ok(await request("POST", `/v1/titles/${movie}/logs`, ana, { watchedOn: "2026-11-05", rating: 5 }), 201);
    expect(log.rewatch).toBe(true);
    expect((await getDetail(movie)).myRating.rating).toBe(5);
  });

  it("apagar o registro mais recente volta a nota anterior", async () => {
    const before = await getDetail(movie);
    const latest = before.logs[0];
    expect(latest.watchedOn).toBe("2026-11-05");
    expect((await request("DELETE", `/v1/logs/${latest.id}`, ana)).status).toBe(204);
    expect((await getDetail(movie)).myRating.rating).toBe(4);
  });

  it("temporada em filme é recusada", async () => {
    expect((await request("POST", `/v1/titles/${movie}/logs`, ana, { watchedOn: "2026-11-05", seasonNumber: 1 })).status).toBe(400);
  });
});

describe("registros de série", () => {
  it("série sem temporada é recusada", async () => {
    expect((await request("POST", `/v1/titles/${show}/logs`, ana, { watchedOn: "2026-11-01" })).status).toBe(400);
  });

  it("temporada que não existe é recusada", async () => {
    expect((await request("POST", `/v1/titles/${show}/logs`, ana, { watchedOn: "2026-11-01", seasonNumber: 7 })).status).toBe(400);
  });

  it("cada temporada tem a sua nota; a média vira sugestão e a nota da série é dada à parte", async () => {
    await ok(await request("POST", `/v1/titles/${show}/logs`, ana, { watchedOn: "2026-09-10", seasonNumber: 1, rating: 4 }), 201);
    const t2 = await ok(await request("POST", `/v1/titles/${show}/logs`, ana, { watchedOn: "2026-10-10", seasonNumber: 2, rating: 4.5 }), 201);
    expect(t2.rewatch).toBe(false);
    const before = await getDetail(show);
    expect(before.seasons.map((season: { myRating: number | null }) => season.myRating)).toEqual([4, 4.5, null]);
    expect(before.seasonSuggestion).toBe(4.5);
    expect(before.myRating).toBeNull();

    await ok(await request("PUT", `/v1/titles/${show}/rating`, ana, { rating: 4.5, liked: true }));
    expect((await getDetail(show)).myRating).toMatchObject({ rating: 4.5, liked: true });
  });

  it("nota da temporada dada direto, sem registro", async () => {
    await ok(await request("PUT", `/v1/titles/${show}/seasons/3/rating`, ana, { rating: 3 }));
    expect((await getDetail(show)).seasons[2].myRating).toBe(3);
    expect((await request("PUT", `/v1/titles/${show}/seasons/9/rating`, ana, { rating: 3 })).status).toBe(400);
    expect((await request("DELETE", `/v1/titles/${show}/seasons/3/rating`, ana)).status).toBe(204);
    expect((await getDetail(show)).seasons[2].myRating).toBeNull();
  });

  it("editar um registro muda a nota da temporada", async () => {
    const log = (await getDetail(show)).logs.find((item: { seasonNumber: number }) => item.seasonNumber === 1);
    await ok(await request("PATCH", `/v1/logs/${log.id}`, ana, { rating: 3.5 }));
    expect((await getDetail(show)).seasons[0].myRating).toBe(3.5);
  });
});

describe("diário", () => {
  it("vem do mais recente para o mais antigo, com número de sessão em ordem de quando foi visto", async () => {
    const page = await ok(await request("GET", "/v1/diary", ana));
    expect(page.items.map((entry: { watchedOn: string }) => entry.watchedOn)).toEqual(["2026-10-10", "2026-10-02", "2026-09-10"]);
    expect(page.items.map((entry: { serial: number }) => entry.serial)).toEqual([3, 2, 1]);
    expect(page.items[0].title).toMatchObject({ title: "Casa de Vidro", tmdbType: "tv" });
  });

  it("pagina e filtra pelo ano", async () => {
    const first = await ok(await request("GET", "/v1/diary?limit=2", ana));
    expect(first.items).toHaveLength(2);
    const second = await ok(await request("GET", `/v1/diary?limit=2&cursor=${encodeURIComponent(first.nextCursor)}`, ana));
    expect(second.items).toHaveLength(1);
    expect((await ok(await request("GET", "/v1/diary?year=2025", ana))).items).toHaveLength(0);
  });

  it("registro privado não aparece para outra pessoa", async () => {
    await ok(await request("POST", `/v1/titles/${movie}/logs`, bia, { watchedOn: "2026-11-01", rating: 2, isPrivate: true }), 201);
    expect((await ok(await request("GET", "/v1/diary", bia))).items).toHaveLength(1);
    expect((await ok(await request("GET", "/v1/diary", ana))).items).toHaveLength(3);
  });

  it("ninguém mexe no registro de outra pessoa", async () => {
    const log = (await getDetail(movie)).logs[0];
    expect((await request("DELETE", `/v1/logs/${log.id}`, bia)).status).toBe(404);
  });
});

describe("nota dada na página não se perde", () => {
  let film: string;
  let series: string;

  beforeAll(async () => {
    film = (await ok(await request("GET", "/v1/titles/by-tmdb/movie/9002", bia))).id;
    series = (await ok(await request("GET", "/v1/titles/by-tmdb/tv/7002", bia))).id;
  });

  it("registro sem nota não apaga a nota do filme dada na página", async () => {
    await ok(await request("PUT", `/v1/titles/${film}/rating`, bia, { rating: 4 }));
    await ok(await request("POST", `/v1/titles/${film}/logs`, bia, { watchedOn: "2026-11-03" }), 201);
    expect((await getDetail(film, bia)).myRating.rating).toBe(4);
  });

  it("registrar a temporada sem nota não apaga a nota da temporada dada na página", async () => {
    await ok(await request("PUT", `/v1/titles/${series}/seasons/2/rating`, bia, { rating: 4.5 }));
    await ok(await request("POST", `/v1/titles/${series}/logs`, bia, { watchedOn: "2026-11-03", seasonNumber: 2 }), 201);
    expect((await getDetail(series, bia)).seasons[1].myRating).toBe(4.5);
  });

  it("editar só o review de um registro não volta a nota mudada na página", async () => {
    const log = await ok(await request("POST", `/v1/titles/${film}/logs`, bia, { watchedOn: "2026-11-04", rating: 3 }), 201);
    await ok(await request("PUT", `/v1/titles/${film}/rating`, bia, { rating: 4.5 }));
    await ok(await request("PATCH", `/v1/logs/${log.id}`, bia, { review: "melhor do que lembrava" }));
    expect((await getDetail(film, bia)).myRating.rating).toBe(4.5);
  });

  it("apagar o único registro com nota mantém a nota", async () => {
    const fresh = (await ok(await request("GET", "/v1/titles/by-tmdb/tv/7001", bia))).id;
    const log = await ok(await request("POST", `/v1/titles/${fresh}/logs`, bia, { watchedOn: "2026-11-04", seasonNumber: 3, rating: 2.5 }), 201);
    expect((await request("DELETE", `/v1/logs/${log.id}`, bia)).status).toBe(204);
    expect((await getDetail(fresh, bia)).seasons[2].myRating).toBe(2.5);
  });
});
