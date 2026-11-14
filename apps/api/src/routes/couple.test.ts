import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type TestHarness, createTestHarness } from "../testing";

const ANA = "11111111-1111-4111-8111-111111111111";
const BIA = "22222222-2222-4222-8222-222222222222";
const CAIO = "33333333-3333-4333-8333-333333333333";
const DUDA = "44444444-4444-4444-8444-444444444444";

let h: TestHarness;
const tokens: Record<string, string> = {};

// biome-ignore lint/suspicious/noExplicitAny: corpo de resposta em teste
const bodyOf = async (response: Response): Promise<any> => response.json();
const request = (method: string, path: string, token: string, body?: unknown) =>
  h.app.request(path, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body !== undefined ? { "content-type": "application/json" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
async function ok(response: Response, status = 200) {
  const body = await bodyOf(response);
  expect(response.status, JSON.stringify(body)).toBe(status);
  return body;
}
const state = async (who: string) => ok(await request("GET", "/v1/couple", tokens[who]!));

beforeAll(async () => {
  h = await createTestHarness();
  for (const [id, username] of [
    [ANA, "ana"],
    [BIA, "bia"],
    [CAIO, "caio"],
    [DUDA, "duda"],
  ] as const) {
    tokens[username] = await h.signIn(id);
    await ok(await request("POST", "/v1/me/profile", tokens[username]!, { username, displayName: username.toUpperCase() }), 201);
  }
});

afterAll(async () => {
  await h.close();
});

describe("convites", () => {
  it("convidar a si mesmo é recusado; @ inexistente é 404", async () => {
    expect((await request("POST", "/v1/couple/invites", tokens.ana!, { username: "@ana" })).status).toBe(400);
    expect((await request("POST", "/v1/couple/invites", tokens.ana!, { username: "ninguem" })).status).toBe(404);
  });

  it("convite aparece para os dois e não pode ser duplicado", async () => {
    const invite = await ok(await request("POST", "/v1/couple/invites", tokens.ana!, { username: "@bia" }), 201);
    expect(invite).toMatchObject({ from: { username: "ana" }, to: { username: "bia" } });
    expect((await state("ana")).outgoing).toHaveLength(1);
    expect((await state("bia")).incoming).toHaveLength(1);
    expect((await request("POST", "/v1/couple/invites", tokens.ana!, { username: "bia" })).status).toBe(409);
  });

  it("recusar e cancelar", async () => {
    const toCaio = await ok(await request("POST", "/v1/couple/invites", tokens.duda!, { username: "caio" }), 201);
    expect((await request("POST", `/v1/couple/invites/${toCaio.id}/cancel`, tokens.caio!)).status).toBe(404);
    await ok(await request("POST", `/v1/couple/invites/${toCaio.id}/decline`, tokens.caio!));
    expect((await state("caio")).incoming).toHaveLength(0);
    const again = await ok(await request("POST", "/v1/couple/invites", tokens.duda!, { username: "caio" }), 201);
    await ok(await request("POST", `/v1/couple/invites/${again.id}/cancel`, tokens.duda!));
    expect((await state("duda")).outgoing).toHaveLength(0);
  });

  it("aceitar forma o par e recusa os outros convites pendentes dos dois", async () => {
    const other = await ok(await request("POST", "/v1/couple/invites", tokens.caio!, { username: "bia" }), 201);
    const invite = (await state("bia")).incoming.find((item: { from: { username: string } }) => item.from.username === "ana");
    await ok(await request("POST", `/v1/couple/invites/${invite.id}/accept`, tokens.bia!));
    const bia = await state("bia");
    expect(bia.partner).toMatchObject({ username: "ana" });
    expect(bia.incoming).toHaveLength(0);
    expect((await state("ana")).partner).toMatchObject({ username: "bia" });
    expect((await request("POST", `/v1/couple/invites/${other.id}/accept`, tokens.bia!)).status).toBe(404);
  });

  it("quem já tem par não convida nem é convidado", async () => {
    const mine = await request("POST", "/v1/couple/invites", tokens.ana!, { username: "caio" });
    expect(mine.status).toBe(409);
    expect((await bodyOf(mine)).error.code).toBe("already_paired");
    const theirs = await request("POST", "/v1/couple/invites", tokens.caio!, { username: "ana" });
    expect(theirs.status).toBe(409);
    expect((await bodyOf(theirs)).error.code).toBe("target_paired");
  });

  it("aceitar quando a outra pessoa já virou par de alguém é recusado", async () => {
    const invite = await ok(await request("POST", "/v1/couple/invites", tokens.caio!, { username: "duda" }), 201);
    const pending = await ok(await request("POST", "/v1/couple/invites", tokens.duda!, { username: "caio" }), 409);
    expect(pending.error.code).toBe("invite_exists");
    await ok(await request("POST", `/v1/couple/invites/${invite.id}/accept`, tokens.duda!));
    expect((await state("duda")).partner).toMatchObject({ username: "caio" });
  });
});

describe("desfazer", () => {
  it("desfaz o vínculo para os dois sem apagar dados", async () => {
    const place = (await ok(await request("POST", "/v1/restaurants", tokens.ana!, { name: "Dos Dois", destination: "quero-ir" }), 201)).id;
    expect((await request("DELETE", "/v1/couple", tokens.bia!)).status).toBe(204);
    expect((await state("ana")).partner).toBeNull();
    expect((await state("bia")).partner).toBeNull();
    expect((await ok(await request("GET", `/v1/restaurants/${place}`, tokens.ana!))).wishlist).not.toBeNull();
    expect((await request("DELETE", "/v1/couple", tokens.bia!)).status).toBe(404);
  });
});
