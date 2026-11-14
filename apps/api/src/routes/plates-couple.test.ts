import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type TestHarness, createTestHarness } from "../testing";
import { type Json, client, setupCouple } from "../testing-couple";

let h: TestHarness;
let t: Record<string, string>;
let api: ReturnType<typeof client>;
let shared: string;

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
  shared = (await api.ok(await api.request("POST", "/v1/restaurants", t.ana!, { name: "Bar dos Dois", destination: "fomos" }), 201)).id;
});

afterAll(async () => {
  await h.close();
});

const names = (page: Json) => page.items.map((item: { name: string }) => item.name);
const detail = async (id: string, who: string) => api.ok(await api.request("GET", `/v1/restaurants/${id}`, t[who]!));

describe("visitas juntos", () => {
  it("com par, a visita do cadastro já é juntos e aparece no caderno do par", async () => {
    expect(names(await api.ok(await api.request("GET", "/v1/restaurants?status=fomos", t.bia!)))).toContain("Bar dos Dois");
    const seen = await detail(shared, "bia");
    expect(seen.visits).toHaveLength(1);
    expect(seen.visits[0]).toMatchObject({ together: true, registeredBy: { username: "ana" } });
    expect((await detail(shared, "ana")).visits[0].registeredBy).toBeNull();
  });

  it("visita marcada como não juntos fica só com quem registrou", async () => {
    await api.ok(await api.request("POST", `/v1/restaurants/${shared}/visits`, t.ana!, { visitedOn: "2026-11-01", together: false }), 201);
    expect((await detail(shared, "bia")).visits).toHaveLength(1);
    expect((await detail(shared, "ana")).visits).toHaveLength(2);
  });

  it("quem é de fora não vê a visita do casal", async () => {
    expect((await detail(shared, "caio")).visits).toHaveLength(0);
    expect(names(await api.ok(await api.request("GET", "/v1/restaurants", t.caio!)))).not.toContain("Bar dos Dois");
  });

  it("o par edita a visita juntos", async () => {
    const visit = (await detail(shared, "bia")).visits[0];
    const updated = await api.ok(await api.request("PATCH", `/v1/visits/${visit.id}`, t.bia!, { occasion: "aniversário" }));
    expect(updated.occasion).toBe("aniversário");
  });

  it("o par apagando a visita só tira do caderno dele", async () => {
    const other = (await api.ok(await api.request("POST", "/v1/restaurants", t.ana!, { name: "Só Tirar", destination: "fomos" }), 201)).id;
    const visit = (await detail(other, "bia")).visits[0];
    await api.ok(await api.request("DELETE", `/v1/visits/${visit.id}`, t.bia!), 204);
    expect((await detail(other, "bia")).visits).toHaveLength(0);
    const kept = (await detail(other, "ana")).visits;
    expect(kept).toHaveLength(1);
    expect(kept[0].together).toBe(false);
  });
});

describe("notas lado a lado", () => {
  it("mostra a nota do par (inclusive privada) e só para o par", async () => {
    await api.ok(await api.request("PUT", `/v1/restaurants/${shared}/rating`, t.ana!, { food: 4 }));
    await api.ok(await api.request("PUT", `/v1/restaurants/${shared}/rating`, t.bia!, { food: 5, isPrivate: true }));
    const forAna = await detail(shared, "ana");
    expect(forAna.partner).toMatchObject({ username: "bia" });
    expect(forAna.myRating.overall).toBe(4);
    expect(forAna.partnerRating.overall).toBe(5);
    const forCaio = await detail(shared, "caio");
    expect(forCaio.partnerRating).toBeNull();
    expect(forCaio.partner).toBeNull();
  });

  it("o par edita o restaurante e os pratos; o ranking usa as duas notas", async () => {
    const dish = await api.ok(await api.request("POST", `/v1/restaurants/${shared}/dishes`, t.bia!, { name: "Pastel" }), 201);
    await api.ok(await api.request("PUT", `/v1/dishes/${dish.id}/rating`, t.ana!, { rating: 4 }));
    await api.ok(await api.request("PUT", `/v1/dishes/${dish.id}/rating`, t.bia!, { rating: 5 }));
    const pastel = (await detail(shared, "ana")).dishes.find((item: { id: string }) => item.id === dish.id);
    expect(pastel).toMatchObject({ score: 4.5, ratingCount: 2, partnerRating: 5, myRating: { rating: 4 } });
    expect((await detail(shared, "bia")).canEdit).toBe(true);
  });
});

describe("quero ir do casal", () => {
  let wish: string;

  it("o que um põe aparece para os dois, com quem adicionou", async () => {
    wish = (await api.ok(await api.request("POST", "/v1/restaurants", t.ana!, { name: "Desejo", destination: "quero-ir" }), 201)).id;
    const forBia = await api.ok(await api.request("GET", "/v1/restaurants?status=quero-ir", t.bia!));
    const item = forBia.items.find((entry: { id: string }) => entry.id === wish);
    expect(item.wishlist.addedBy.map((person: { username: string }) => person.username)).toEqual(["ana"]);
  });

  it("os dois adicionando aparece uma vez, pelos dois", async () => {
    await api.ok(await api.request("PUT", `/v1/restaurants/${wish}/wishlist`, t.bia!, { priority: "alta" }));
    const page = await api.ok(await api.request("GET", "/v1/restaurants?status=quero-ir", t.ana!));
    const items = page.items.filter((entry: { id: string }) => entry.id === wish);
    expect(items).toHaveLength(1);
    expect(items[0].wishlist.priority).toBe("alta");
    expect(items[0].wishlist.addedBy.map((person: { username: string }) => person.username).sort()).toEqual(["ana", "bia"]);
  });

  it("Fomos! de um tira para os dois", async () => {
    await api.ok(await api.request("POST", `/v1/restaurants/${wish}/fomos`, t.bia!, {}), 201);
    for (const who of ["ana", "bia"]) {
      const page = await api.ok(await api.request("GET", "/v1/restaurants?status=quero-ir", t[who]!));
      expect(page.items.map((entry: { id: string }) => entry.id)).not.toContain(wish);
    }
  });

  it("tirar da lista tira para os dois", async () => {
    const other = (await api.ok(await api.request("POST", "/v1/restaurants", t.bia!, { name: "Talvez", destination: "quero-ir" }), 201)).id;
    await api.ok(await api.request("DELETE", `/v1/restaurants/${other}/wishlist`, t.ana!), 204);
    const page = await api.ok(await api.request("GET", "/v1/restaurants?status=quero-ir", t.bia!));
    expect(page.items.map((entry: { id: string }) => entry.id)).not.toContain(other);
  });
});
