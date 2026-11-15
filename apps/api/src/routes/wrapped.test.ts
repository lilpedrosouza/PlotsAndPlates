import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type TestHarness, createTestHarness } from "../testing";
import { type Json, client, setupCouple } from "../testing-couple";

let h: TestHarness;
let t: Record<string, string>;
let api: ReturnType<typeof client>;
let cantina: string;
let sushi: string;
let movie: string;

const wrapped = async (who: string, year: number): Promise<Json> => api.ok(await api.request("GET", `/v1/wrapped/${year}`, t[who]!));

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
  const post = async (who: string, path: string, body: unknown, status = 201) => api.ok(await api.request("POST", path, t[who]!, body), status);
  cantina = (await post("ana", "/v1/restaurants", { name: "Cantina", cuisines: ["italiana"], destination: "quero-ir" })).id;
  sushi = (await post("bia", "/v1/restaurants", { name: "Sushi", cuisines: ["japonesa"], destination: "quero-ir" })).id;
  const dish = await post("ana", `/v1/restaurants/${cantina}/dishes`, { name: "Lasanha" });
  // Uma visita juntos (conta uma vez) e uma de cada um sozinho.
  await post("ana", `/v1/restaurants/${cantina}/visits`, { visitedOn: "2026-11-01", dishIds: [dish.id] });
  await post("ana", `/v1/restaurants/${cantina}/visits`, { visitedOn: "2026-02-01", together: false, dishIds: [dish.id] });
  await post("bia", `/v1/restaurants/${sushi}/visits`, { visitedOn: "2026-03-01", together: false });
  for (const [who, place, food] of [["ana", cantina, 5], ["bia", cantina, 4], ["ana", sushi, 3], ["bia", sushi, 3]] as const) {
    await api.ok(await api.request("PUT", `/v1/restaurants/${place}/rating`, t[who]!, { food }));
  }
  movie = (await api.ok(await api.request("GET", "/v1/titles/by-tmdb/movie/9001", t.ana!))).id;
  const show = (await api.ok(await api.request("GET", "/v1/titles/by-tmdb/tv/7001", t.ana!))).id;
  await post("ana", `/v1/titles/${movie}/logs`, { watchedOn: "2026-10-01", rating: 4 });
  await post("bia", `/v1/titles/${show}/logs`, { watchedOn: "2026-10-05", seasonNumber: 1, rating: 5, together: false });
  // 2025: só a Ana avaliou o que visitou.
  const solo = (await post("ana", "/v1/restaurants", { name: "Solo", destination: "quero-ir" })).id;
  await post("ana", `/v1/restaurants/${solo}/visits`, { visitedOn: "2025-05-01" });
  await api.ok(await api.request("PUT", `/v1/restaurants/${solo}/rating`, t.ana!, { food: 4 }));
});

afterAll(async () => {
  await h.close();
});

describe("Wrapped do casal", () => {
  it("Plates: visita juntos conta uma vez; pratos, cozinha, mais visitado e campeão", async () => {
    const w = await wrapped("ana", 2026);
    expect(w.people.map((p: Json) => p.username)).toEqual(["ana", "bia"]);
    expect(w.plates).toMatchObject({ restaurants: 2, visits: 3, dishes: 1 });
    expect(w.plates.favoriteCuisine).toEqual({ name: "italiana", count: 2 });
    expect(w.plates.mostVisited).toMatchObject({ id: cantina, name: "Cantina", visits: 2 });
    expect(w.plates.champion).toMatchObject({ id: cantina, ratings: { mine: 5, partner: 4, couple: 4.5 } });
  });

  it("Plots: sessão juntos (espelho) conta uma vez; minutos de filme e temporada", async () => {
    const w = await wrapped("bia", 2026);
    expect(w.plots).toMatchObject({ sessions: 2, together: 1, minutes: 104 + 8 * 48, titles: 2 });
    expect(w.plots.favoriteGenre).not.toBeNull();
    expect(w.plots.champion).not.toBeNull();
  });

  it("onde concordaram e discordaram, do ponto de vista de quem pede", async () => {
    const w = await wrapped("bia", 2026);
    expect(w.couple.equal).toBe(1);
    expect(w.couple.agreed).toMatchObject({ kind: "restaurant", id: sushi, mine: 3, partner: 3 });
    expect(w.couple.disagreed).toMatchObject({ kind: "restaurant", id: cantina, mine: 4, partner: 5 });
  });

  it("sem nota em comum no ano, nada de concordar ou discordar", async () => {
    const w = await wrapped("ana", 2025);
    expect(w.plates.visits).toBe(1);
    expect(w.couple).toEqual({ equal: 0, agreed: null, disagreed: null });
    expect(w.partial).toBe(false);
  });

  it("anos com dados; ano vazio dá zeros; ano fora do intervalo é 400", async () => {
    expect((await api.ok(await api.request("GET", "/v1/wrapped", t.bia!))).years).toEqual([2026, 2025]);
    const empty = await wrapped("ana", 2019);
    expect(empty.plates).toMatchObject({ restaurants: 0, visits: 0, favoriteCuisine: null, champion: null });
    expect(empty.plots).toMatchObject({ sessions: 0, minutes: 0, mostWatched: null });
    expect((await api.request("GET", "/v1/wrapped/1999", t.ana!)).status).toBe(400);
  });

  it("quem não tem par vê só os próprios números", async () => {
    const w = await wrapped("caio", 2026);
    expect(w.people).toHaveLength(1);
    expect(w.couple).toBeNull();
    expect(w.plates.visits).toBe(0);
    expect((await api.ok(await api.request("GET", "/v1/wrapped", t.caio!))).years).toEqual([]);
  });

  it("conquistas do ano de quem pede", async () => {
    const w = await wrapped("ana", 2026);
    expect(w.achievements.map((a: Json) => a.key)).toEqual(expect.arrayContaining(["primeira-mesa", "primeiro-encontro"]));
  });
});
