import { expect } from "vitest";
import type { TestHarness } from "./testing";

// biome-ignore lint/suspicious/noExplicitAny: corpo de resposta em teste
export type Json = any;

/** Atalhos de requisição para os testes de casal. */
export function client(h: TestHarness) {
  const request = (method: string, path: string, token: string, body?: unknown) =>
    h.app.request(path, {
      method,
      headers: { authorization: `Bearer ${token}`, ...(body !== undefined ? { "content-type": "application/json" } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  const ok = async (response: Response, status = 200): Promise<Json> => {
    const body = response.status === 204 ? null : await response.json();
    expect(response.status, JSON.stringify(body)).toBe(status);
    return body;
  };
  return { request, ok };
}

/** Cria as contas com perfil e liga as duas primeiras como par. Devolve os tokens por username. */
export async function setupCouple(h: TestHarness, people: [string, string][], couple: [string, string] | null) {
  const { request, ok } = client(h);
  const tokens: Record<string, string> = {};
  for (const [id, username] of people) {
    tokens[username] = await h.signIn(id);
    await ok(await request("POST", "/v1/me/profile", tokens[username]!, { username, displayName: username[0]!.toUpperCase() + username.slice(1) }), 201);
  }
  if (couple) {
    const invite = await ok(await request("POST", "/v1/couple/invites", tokens[couple[0]]!, { username: couple[1] }), 201);
    await ok(await request("POST", `/v1/couple/invites/${invite.id}/accept`, tokens[couple[1]]!));
  }
  return tokens;
}
