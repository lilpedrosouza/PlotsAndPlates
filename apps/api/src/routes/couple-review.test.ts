import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type TestHarness, createTestHarness } from "../testing";
import { client, setupCouple } from "../testing-couple";

const ANA = "11111111-1111-4111-8111-111111111111";
const BIA = "22222222-2222-4222-8222-222222222222";

let h: TestHarness;
let t: Record<string, string>;
let api: ReturnType<typeof client>;
let place: string;

const pair = async (from: string, to: string) => {
  const invite = await api.ok(await api.request("POST", "/v1/couple/invites", t[from]!, { username: to }), 201);
  await api.ok(await api.request("POST", `/v1/couple/invites/${invite.id}/accept`, t[to]!));
};
const unpair = async (who: string) => api.ok(await api.request("DELETE", "/v1/couple", t[who]!), 204);

beforeAll(async () => {
  h = await createTestHarness();
  api = client(h);
  t = await setupCouple(
    h,
    [
      [ANA, "ana"],
      [BIA, "bia"],
      ["33333333-3333-4333-8333-333333333333", "caio"],
      ["44444444-4444-4444-8444-444444444444", "duda"],
    ],
    ["ana", "bia"],
  );
  place = (await api.ok(await api.request("POST", "/v1/restaurants", t.ana!, { name: "Cantina da Revisão", destination: "quero-ir" }), 201)).id;
});

afterAll(async () => {
  await h.close();
});

describe("visita juntos com fotos dos dois", () => {
  it("o par edita mandando a lista de fotos com as de quem registrou, e quem registrou edita depois", async () => {
    const visit = await api.ok(
      await api.request("POST", `/v1/restaurants/${place}/visits`, t.ana!, { visitedOn: "2026-11-01", photoPaths: [`visits/${ANA}/a.webp`] }),
      201,
    );
    const byBia = await api.ok(
      await api.request("PATCH", `/v1/visits/${visit.id}`, t.bia!, { occasion: "x", photoPaths: [`visits/${ANA}/a.webp`, `visits/${BIA}/b.webp`] }),
    );
    expect(byBia.photos).toHaveLength(2);
    const byAna = await api.ok(
      await api.request("PATCH", `/v1/visits/${visit.id}`, t.ana!, { occasion: "y", photoPaths: [`visits/${ANA}/a.webp`, `visits/${BIA}/b.webp`] }),
    );
    expect(byAna.occasion).toBe("y");
  });

  it("ninguém põe na visita uma foto nova que não enviou", async () => {
    const visit = await api.ok(await api.request("POST", `/v1/restaurants/${place}/visits`, t.ana!, { visitedOn: "2026-11-02" }), 201);
    expect((await api.request("PATCH", `/v1/visits/${visit.id}`, t.bia!, { photoPaths: [`visits/${ANA}/forjada.webp`] })).status).toBe(400);
  });
});

describe("par novo não herda o par antigo", () => {
  it("visitas juntos de antes não aparecem para quem virou par depois", async () => {
    const own = (await api.ok(await api.request("POST", "/v1/restaurants", t.ana!, { name: "Bistrô do Passado", destination: "fomos" }), 201)).id;
    const before = await api.ok(await api.request("GET", `/v1/restaurants/${own}`, t.bia!));
    expect(before.visits).toHaveLength(1);
    await unpair("ana");
    await pair("ana", "caio");
    const caio = await api.ok(await api.request("GET", `/v1/restaurants/${own}`, t.caio!));
    expect(caio.visits).toHaveLength(0);
    const profile = await api.ok(await api.request("GET", "/v1/profiles/caio/plates", t.duda!));
    expect(profile.stats.visits).toBe(0);
    // Uma visita nova com o Caio aparece para ele.
    await api.ok(await api.request("POST", `/v1/restaurants/${own}/visits`, t.ana!, { visitedOn: "2026-11-05" }), 201);
    expect((await api.ok(await api.request("GET", `/v1/restaurants/${own}`, t.caio!))).visits).toHaveLength(1);
    await unpair("ana");
    await pair("ana", "bia");
  });
});

describe("privado em Plots", () => {
  it("perfil público não conta sessões nem títulos privados", async () => {
    const one = (await api.ok(await api.request("GET", "/v1/titles/by-tmdb/movie/9001", t.duda!))).id;
    const two = (await api.ok(await api.request("GET", "/v1/titles/by-tmdb/movie/9003", t.duda!))).id;
    await api.ok(await api.request("POST", `/v1/titles/${one}/logs`, t.duda!, { watchedOn: "2026-11-01" }), 201);
    await api.ok(await api.request("POST", `/v1/titles/${two}/logs`, t.duda!, { watchedOn: "2026-11-02", isPrivate: true }), 201);
    const seen = await api.ok(await api.request("GET", "/v1/profiles/duda/plots", t.caio!));
    expect(seen.stats).toMatchObject({ sessions: 1, titles: 1 });
    const own = await api.ok(await api.request("GET", "/v1/profiles/duda/plots", t.duda!));
    expect(own.stats).toMatchObject({ sessions: 2, titles: 2 });
  });

  it("sessão juntos privada cria o registro do par também privado", async () => {
    const movie = (await api.ok(await api.request("GET", "/v1/titles/by-tmdb/movie/9001", t.ana!))).id;
    await api.ok(await api.request("POST", `/v1/titles/${movie}/logs`, t.ana!, { watchedOn: "2026-11-03", isPrivate: true }), 201);
    const diary = await api.ok(await api.request("GET", "/v1/diary", t.bia!));
    expect(diary.items[0]).toMatchObject({ titleId: movie, together: true, isPrivate: true });
    const outside = await api.ok(await api.request("GET", "/v1/profiles/bia/plots", t.caio!));
    expect(outside.recent).toHaveLength(0);
  });
});
