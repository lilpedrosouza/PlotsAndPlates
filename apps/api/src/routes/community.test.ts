import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type TestHarness, createTestHarness } from "../testing";
import { client, setupCouple } from "../testing-couple";

let h: TestHarness;
let t: Record<string, string>;
let api: ReturnType<typeof client>;
let place: string;
let movie: string;

beforeAll(async () => {
  h = await createTestHarness();
  api = client(h);
  t = await setupCouple(
    h,
    [
      ["11111111-1111-4111-8111-111111111111", "ana"],
      ["22222222-2222-4222-8222-222222222222", "bia"],
      ["33333333-3333-4333-8333-333333333333", "caio"],
      ["44444444-4444-4444-8444-444444444444", "duda"],
    ],
    ["ana", "bia"],
  );
  place = (await api.ok(await api.request("POST", "/v1/restaurants", t.ana!, { name: "Cantina Comum", destination: "fomos" }), 201)).id;
  await api.ok(await api.request("PUT", `/v1/restaurants/${place}/rating`, t.ana!, { food: 4, review: "Da Ana" }));
  await api.ok(await api.request("PUT", `/v1/restaurants/${place}/rating`, t.bia!, { food: 2, review: "Segredo da Bia", isPrivate: true }));
  await api.ok(await api.request("PUT", `/v1/restaurants/${place}/rating`, t.caio!, { food: 5, review: "Do Caio" }));
  await api.ok(await api.request("PUT", `/v1/restaurants/${place}/rating`, t.duda!, { food: 1, review: "Privado da Duda", isPrivate: true }));
  movie = (await api.ok(await api.request("GET", "/v1/titles/by-tmdb/movie/9001", t.ana!))).id;
  await api.ok(await api.request("POST", `/v1/titles/${movie}/logs`, t.caio!, { watchedOn: "2026-11-01", rating: 3, review: "ok" }), 201);
  await api.ok(await api.request("POST", `/v1/titles/${movie}/logs`, t.duda!, { watchedOn: "2026-11-02", rating: 5, isPrivate: true }), 201);
  await api.ok(await api.request("POST", `/v1/titles/${movie}/logs`, t.ana!, { watchedOn: "2026-11-03", rating: 4, together: false }), 201);
});

afterAll(async () => {
  await h.close();
});

const reviewers = (page: { items: { person: { username: string } }[] }) => page.items.map((item) => item.person.username);

describe("o que o pessoal do PAP achou", () => {
  it("no restaurante: sem você, sem o par e sem privadas", async () => {
    const forAna = await api.ok(await api.request("GET", `/v1/restaurants/${place}/community`, t.ana!));
    expect(reviewers(forAna)).toEqual(["caio"]);
    expect(forAna).toMatchObject({ average: 5, count: 1 });
    const forCaio = await api.ok(await api.request("GET", `/v1/restaurants/${place}/community`, t.caio!));
    expect(reviewers(forCaio)).toEqual(["ana"]);
    expect(forCaio.items[0]).toMatchObject({ rating: 4, review: "Da Ana" });
  });

  it("no título: sessões públicas dos outros", async () => {
    const forBia = await api.ok(await api.request("GET", `/v1/titles/${movie}/community`, t.bia!));
    expect(reviewers(forBia)).toEqual(["caio"]);
    expect(forBia).toMatchObject({ average: 3, count: 1 });
    const forDuda = await api.ok(await api.request("GET", `/v1/titles/${movie}/community`, t.duda!));
    expect(reviewers(forDuda).sort()).toEqual(["ana", "caio"]);
  });

  it("pagina", async () => {
    const first = await api.ok(await api.request("GET", `/v1/titles/${movie}/community?limit=1`, t.duda!));
    expect(first.items).toHaveLength(1);
    const second = await api.ok(await api.request("GET", `/v1/titles/${movie}/community?limit=1&cursor=${encodeURIComponent(first.nextCursor)}`, t.duda!));
    expect(second.items).toHaveLength(1);
    expect(second.nextCursor).toBeNull();
  });
});

describe("perfil público", () => {
  it("Plates: favoritos e recentes só com o que é público para quem é de fora", async () => {
    const seen = await api.ok(await api.request("GET", "/v1/profiles/bia/plates", t.caio!));
    expect(seen.profile.username).toBe("bia");
    expect(seen.favorites).toHaveLength(0);
    expect(seen.recent).toHaveLength(0);
    expect(seen.isPartner).toBe(false);
    const ana = await api.ok(await api.request("GET", "/v1/profiles/ana/plates", t.caio!));
    expect(ana.favorites.map((item: { name: string }) => item.name)).toEqual(["Cantina Comum"]);
    expect(ana.stats).toMatchObject({ restaurants: 1, visits: 1, averageRating: 4 });
  });

  it("o par vê também o privado", async () => {
    const seen = await api.ok(await api.request("GET", "/v1/profiles/bia/plates", t.ana!));
    expect(seen.isPartner).toBe(true);
    expect(seen.recent.map((item: { review: string }) => item.review)).toEqual(["Segredo da Bia"]);
  });

  it("Plots: Top 4 e sessões públicas", async () => {
    await api.ok(await api.request("PUT", "/v1/me/favorites", t.duda!, { titleIds: [movie] }));
    const duda = await api.ok(await api.request("GET", "/v1/profiles/duda/plots", t.caio!));
    expect(duda.favorites.map((item: { id: string }) => item.id)).toEqual([movie]);
    expect(duda.recent).toHaveLength(0);
    expect(duda.stats.sessions).toBe(1);
    const caio = await api.ok(await api.request("GET", "/v1/profiles/caio/plots", t.duda!));
    expect(caio.recent[0]).toMatchObject({ titleId: movie, rating: 3, review: "ok" });
  });

  it("@ inexistente é 404", async () => {
    expect((await api.request("GET", "/v1/profiles/ninguem/plates", t.ana!)).status).toBe(404);
  });
});
