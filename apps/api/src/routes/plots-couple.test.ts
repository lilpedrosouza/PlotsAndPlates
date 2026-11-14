import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type TestHarness, createTestHarness } from "../testing";
import { client, setupCouple } from "../testing-couple";

let h: TestHarness;
let t: Record<string, string>;
let api: ReturnType<typeof client>;
let movie: string;
let show: string;

beforeAll(async () => {
  h = await createTestHarness();
  api = client(h);
  t = await setupCouple(
    h,
    [
      ["11111111-1111-4111-8111-111111111111", "ana"],
      ["22222222-2222-4222-8222-222222222222", "bia"],
      ["33333333-3333-4333-8333-333333333333", "caio"],
    ],
    ["ana", "bia"],
  );
  movie = (await api.ok(await api.request("GET", "/v1/titles/by-tmdb/movie/9001", t.ana!))).id;
  show = (await api.ok(await api.request("GET", "/v1/titles/by-tmdb/tv/7001", t.ana!))).id;
});

afterAll(async () => {
  await h.close();
});

const diary = async (who: string) => (await api.ok(await api.request("GET", "/v1/diary", t[who]!))).items;
const detail = async (id: string, who: string) => api.ok(await api.request("GET", `/v1/titles/${id}`, t[who]!));

describe("vimos juntos", () => {
  it("com par, o registro já é juntos e cria o do par sem nota", async () => {
    const log = await api.ok(await api.request("POST", `/v1/titles/${movie}/logs`, t.ana!, { watchedOn: "2026-11-01", rating: 4, review: "lindo" }), 201);
    expect(log.together).toBe(true);
    const bia = await diary("bia");
    expect(bia).toHaveLength(1);
    expect(bia[0]).toMatchObject({ titleId: movie, watchedOn: "2026-11-01", together: true, rating: null, review: "" });
    expect((await diary("ana"))[0].rating).toBe(4);
  });

  it("temporada juntos cria a mesma temporada para o par", async () => {
    await api.ok(await api.request("POST", `/v1/titles/${show}/logs`, t.bia!, { watchedOn: "2026-11-02", seasonNumber: 2, rating: 5 }), 201);
    const ana = (await diary("ana")).find((entry: { titleId: string }) => entry.titleId === show);
    expect(ana).toMatchObject({ seasonNumber: 2, together: true, rating: null });
  });

  it("marcado como não juntos fica só com quem registrou", async () => {
    await api.ok(await api.request("POST", `/v1/titles/${movie}/logs`, t.ana!, { watchedOn: "2026-11-03", together: false }), 201);
    expect(await diary("bia")).toHaveLength(2);
    expect(await diary("ana")).toHaveLength(3);
  });

  it("quem é de fora não ganha registro", async () => {
    expect(await diary("caio")).toHaveLength(0);
  });
});

describe("notas lado a lado", () => {
  it("mostra a nota do par no título e nas temporadas", async () => {
    await api.ok(await api.request("PUT", `/v1/titles/${movie}/rating`, t.bia!, { rating: 4.5, isPrivate: true }));
    const forAna = await detail(movie, "ana");
    expect(forAna).toMatchObject({ partner: { username: "bia" }, partnerRating: 4.5, myRating: { rating: 4 } });
    const seasons = (await detail(show, "ana")).seasons;
    expect(seasons.find((season: { number: number }) => season.number === 2).partnerRating).toBe(5);
    expect((await detail(movie, "caio")).partnerRating).toBeNull();
  });
});

describe("quero ver do casal", () => {
  let wanted: string;

  beforeAll(async () => {
    wanted = (await api.ok(await api.request("GET", "/v1/titles/by-tmdb/movie/9003", t.ana!))).id;
  });

  it("o que um põe aparece para os dois; os dois juntos aparece uma vez", async () => {
    await api.ok(await api.request("PUT", `/v1/titles/${wanted}/watchlist`, t.ana!, {}));
    let items = (await api.ok(await api.request("GET", "/v1/watchlist", t.bia!))).items;
    expect(items.map((item: { addedBy: { username: string }[] }) => item.addedBy.map((p) => p.username))).toEqual([["ana"]]);
    await api.ok(await api.request("PUT", `/v1/titles/${wanted}/watchlist`, t.bia!, {}));
    items = (await api.ok(await api.request("GET", "/v1/watchlist", t.ana!))).items;
    expect(items).toHaveLength(1);
    expect(items[0].addedBy.map((p: { username: string }) => p.username).sort()).toEqual(["ana", "bia"]);
    expect((await detail(wanted, "bia")).inWatchlist).toBe(true);
    expect((await api.ok(await api.request("GET", "/v1/watchlist", t.caio!))).items).toHaveLength(0);
  });

  it("Assistimos! de um tira para os dois e põe no diário dos dois", async () => {
    await api.ok(await api.request("POST", `/v1/titles/${wanted}/assistimos`, t.bia!, { watchedOn: "2026-11-05", rating: 3 }), 201);
    for (const who of ["ana", "bia"]) {
      expect((await api.ok(await api.request("GET", "/v1/watchlist", t[who]!))).items).toHaveLength(0);
      expect((await diary(who)).some((entry: { titleId: string }) => entry.titleId === wanted)).toBe(true);
    }
  });

  it("tirar da lista tira para os dois", async () => {
    await api.ok(await api.request("PUT", `/v1/titles/${movie}/watchlist`, t.bia!, {}));
    await api.ok(await api.request("DELETE", `/v1/titles/${movie}/watchlist`, t.ana!), 204);
    expect((await api.ok(await api.request("GET", "/v1/watchlist", t.bia!))).items).toHaveLength(0);
  });
});
