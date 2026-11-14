import type { MeResponse, OwnProfile, PublicProfile, SignedUpload } from "@pap/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TEST_MEDIA_BASE, type TestHarness, createTestHarness } from "./testing";

const ANA = "11111111-1111-4111-8111-111111111111";
const BIA = "22222222-2222-4222-8222-222222222222";
const CAIO = "33333333-3333-4333-8333-333333333333";

let h: TestHarness;
let anaToken: string;
let biaToken: string;

// As respostas dos testes são inspecionadas livremente; o formato é conferido pelos `expect`.
// biome-ignore lint/suspicious/noExplicitAny: corpo de resposta em teste
type TestResponse = Omit<Response, "json"> & { json: () => Promise<any> };

const call = async (path: string, token?: string, init: RequestInit = {}): Promise<TestResponse> =>
  h.app.request(path, {
    ...init,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });

const send = (method: string, path: string, token: string, body: unknown) =>
  call(path, token, { method, body: JSON.stringify(body) });

beforeAll(async () => {
  h = await createTestHarness();
  anaToken = await h.signIn(ANA);
  biaToken = await h.signIn(BIA);
});

afterAll(async () => {
  await h.close();
});

describe("saúde e rotas desconhecidas", () => {
  it("GET /health responde sem autenticação", async () => {
    const response = await call("/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, service: "pap-api" });
  });

  it("rota inexistente devolve 404 no formato da API", async () => {
    const response = await call("/nada");
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: { code: "not_found", message: "Rota não encontrada." } });
  });
});

describe("autenticação", () => {
  it("recusa requisição sem token", async () => {
    const response = await call("/v1/me");
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("unauthorized");
  });

  it("recusa token malformado", async () => {
    expect((await call("/v1/me", "isso-nao-e-um-jwt")).status).toBe(401);
  });

  it("recusa token assinado por chave desconhecida", async () => {
    expect((await call("/v1/me", await h.signWithUnknownKey(ANA))).status).toBe(401);
  });

  it("recusa token expirado", async () => {
    expect((await call("/v1/me", await h.signToken(ANA, { expiresIn: "-1m" }))).status).toBe(401);
  });

  it("recusa token de outro emissor", async () => {
    const token = await h.signToken(ANA, { issuer: "https://outro.supabase.co/auth/v1" });
    expect((await call("/v1/me", token)).status).toBe(401);
  });

  it("recusa token com público ou papel errado", async () => {
    expect((await call("/v1/me", await h.signToken(ANA, { audience: "anon" }))).status).toBe(401);
    expect((await call("/v1/me", await h.signToken(ANA, { role: "anon" }))).status).toBe(401);
  });

  it("recusa usuário anônimo do Supabase", async () => {
    expect((await call("/v1/me", await h.signToken(ANA, { isAnonymous: true }))).status).toBe(401);
  });
});

describe("primeiro acesso e perfil", () => {
  it("antes do primeiro acesso, /me devolve perfil nulo", async () => {
    const response = await call("/v1/me", anaToken);
    expect(response.status).toBe(200);
    const body = (await response.json()) as MeResponse;
    expect(body.user).toEqual({ id: ANA, email: `${ANA}@pap.test` });
    expect(body.profile).toBeNull();
  });

  it("não deixa editar um perfil que ainda não existe", async () => {
    const response = await send("PATCH", "/v1/me/profile", anaToken, { bio: "oi" });
    expect(response.status).toBe(404);
  });

  it("cria o perfil normalizando o @username", async () => {
    const response = await send("POST", "/v1/me/profile", anaToken, { username: "  Ana.Souza ", displayName: " Ana " });
    expect(response.status).toBe(201);
    const profile = (await response.json()) as OwnProfile;
    expect(profile).toMatchObject({
      id: ANA,
      username: "ana.souza",
      displayName: "Ana",
      bio: "",
      accent: "padrao",
      streamings: [],
      avatarUrl: null,
      bannerUrl: null,
    });
  });

  it("não cria um segundo perfil para a mesma conta", async () => {
    const response = await send("POST", "/v1/me/profile", anaToken, { username: "ana2", displayName: "Ana" });
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("profile_exists");
  });

  it("recusa @username já usado por outra pessoa", async () => {
    const response = await send("POST", "/v1/me/profile", biaToken, { username: "ana.souza", displayName: "Bia" });
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe("username_taken");
    expect(body.error.fields.username).toBeDefined();
  });

  it.each([
    [{ username: "ab", displayName: "Bia" }, "username"],
    [{ username: "1bia", displayName: "Bia" }, "username"],
    [{ username: "bia maria", displayName: "Bia" }, "username"],
    [{ username: "plates", displayName: "Bia" }, "username"],
    [{ username: "bia", displayName: "" }, "displayName"],
    [{ username: "bia", displayName: "x".repeat(51) }, "displayName"],
  ])("recusa entrada inválida %j", async (input, field) => {
    const response = await send("POST", "/v1/me/profile", biaToken, input);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("invalid_input");
    expect(body.error.fields[field]).toBeDefined();
  });

  it("recusa corpo que não é JSON válido", async () => {
    const response = await call("/v1/me/profile", biaToken, { method: "POST", body: "{nao é json" });
    expect(response.status).toBe(400);
  });

  it("cria o perfil da segunda pessoa", async () => {
    const response = await send("POST", "/v1/me/profile", biaToken, { username: "bia", displayName: "Bia Lima" });
    expect(response.status).toBe(201);
  });

  it("edita bio, cor de destaque e streamings (sem repetir)", async () => {
    const response = await send("PATCH", "/v1/me/profile", anaToken, {
      bio: "Sempre pede sobremesa.",
      accent: "oliva",
      streamings: ["netflix", "mubi", "netflix"],
    });
    expect(response.status).toBe(200);
    const profile = (await response.json()) as OwnProfile;
    expect(profile.bio).toBe("Sempre pede sobremesa.");
    expect(profile.accent).toBe("oliva");
    expect(profile.streamings).toEqual(["netflix", "mubi"]);
    expect(profile.username).toBe("ana.souza");
  });

  it.each([
    [{ accent: "rosa-choque" }, "accent"],
    [{ streamings: ["locadora"] }, "streamings.0"],
    [{ bio: "x".repeat(281) }, "bio"],
    [{}, "_"],
  ])("recusa edição inválida %j", async (input, field) => {
    const response = await send("PATCH", "/v1/me/profile", anaToken, input);
    expect(response.status).toBe(400);
    expect((await response.json()).error.fields[field]).toBeDefined();
  });

  it("não deixa trocar para um @username em uso", async () => {
    const response = await send("PATCH", "/v1/me/profile", anaToken, { username: "bia" });
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("username_taken");
  });

  it("ignora campos que o cliente não pode definir", async () => {
    const response = await send("PATCH", "/v1/me/profile", anaToken, { bio: "nova bio", id: BIA, createdAt: "2000-01-01" });
    expect(response.status).toBe(200);
    const profile = (await response.json()) as OwnProfile;
    expect(profile.id).toBe(ANA);
    expect(profile.createdAt.startsWith("2000")).toBe(false);
  });
});

describe("imagens do perfil", () => {
  let avatar: SignedUpload;

  it("autoriza upload só na pasta do próprio usuário", async () => {
    const response = await send("POST", "/v1/uploads/sign", anaToken, { kind: "avatar" });
    expect(response.status).toBe(201);
    avatar = (await response.json()) as SignedUpload;
    expect(avatar.bucket).toBe("media");
    expect(avatar.path).toMatch(new RegExp(`^avatars/${ANA}/[0-9a-f-]{36}\\.webp$`));
    expect(avatar.token).toBeTruthy();
  });

  it("recusa tipo de upload desconhecido", async () => {
    const response = await send("POST", "/v1/uploads/sign", anaToken, { kind: "executavel" });
    expect(response.status).toBe(400);
  });

  it("salva o avatar e devolve a URL pública", async () => {
    const response = await send("PATCH", "/v1/me/profile", anaToken, { avatarPath: avatar.path });
    expect(response.status).toBe(200);
    const profile = (await response.json()) as OwnProfile;
    expect(profile.avatarUrl).toBe(`${TEST_MEDIA_BASE}/${avatar.path}`);
  });

  it("recusa imagem da pasta de outra pessoa ou de outro tipo", async () => {
    const foreign = `avatars/${BIA}/00000000-0000-4000-8000-000000000000.webp`;
    expect((await send("PATCH", "/v1/me/profile", anaToken, { avatarPath: foreign })).status).toBe(400);
    expect((await send("PATCH", "/v1/me/profile", anaToken, { bannerPath: avatar.path })).status).toBe(400);
    expect((await send("PATCH", "/v1/me/profile", anaToken, { avatarPath: "../segredo.webp" })).status).toBe(400);
  });

  it("ao trocar ou remover o avatar, apaga o arquivo antigo", async () => {
    const next = (await (await send("POST", "/v1/uploads/sign", anaToken, { kind: "avatar" })).json()) as SignedUpload;
    await send("PATCH", "/v1/me/profile", anaToken, { avatarPath: next.path });
    expect(h.removed).toContain(avatar.path);

    const cleared = await send("PATCH", "/v1/me/profile", anaToken, { avatarPath: null });
    expect(((await cleared.json()) as OwnProfile).avatarUrl).toBeNull();
    expect(h.removed).toContain(next.path);
  });
});

describe("perfis de outras pessoas", () => {
  it("mostra o perfil público sem dados privados", async () => {
    const response = await call("/v1/profiles/ana.souza", biaToken);
    expect(response.status).toBe(200);
    const profile = (await response.json()) as PublicProfile & Record<string, unknown>;
    expect(profile.username).toBe("ana.souza");
    expect(profile.displayName).toBe("Ana");
    expect(profile).not.toHaveProperty("streamings");
    expect(profile).not.toHaveProperty("avatarPath");
    expect(profile).not.toHaveProperty("email");
  });

  it("devolve 404 para @username que não existe", async () => {
    expect((await call("/v1/profiles/ninguem", biaToken)).status).toBe(404);
  });

  it("busca por @username ou por nome, sem diferenciar maiúsculas", async () => {
    const byUsername = await (await call("/v1/profiles?q=ANA", biaToken)).json();
    expect(byUsername.profiles.map((p: PublicProfile) => p.username)).toEqual(["ana.souza"]);

    const byName = await (await call("/v1/profiles?q=lima", anaToken)).json();
    expect(byName.profiles.map((p: PublicProfile) => p.username)).toEqual(["bia"]);

    const withAt = await (await call("/v1/profiles?q=@bia", anaToken)).json();
    expect(withAt.profiles).toHaveLength(1);
  });

  it("trata curingas da busca como texto", async () => {
    const response = await (await call("/v1/profiles?q=%25%25", anaToken)).json();
    expect(response.profiles).toEqual([]);
  });

  it("exige pelo menos 2 caracteres na busca", async () => {
    expect((await call("/v1/profiles?q=a", anaToken)).status).toBe(400);
  });

  it("informa se um @username está livre", async () => {
    expect(await (await call("/v1/usernames/livre", anaToken)).json()).toEqual({ available: true });
    expect((await (await call("/v1/usernames/bia", anaToken)).json()).available).toBe(false);
    expect((await (await call("/v1/usernames/ab", anaToken)).json()).available).toBe(false);
    // O próprio @username conta como disponível para quem já é dono dele.
    expect(await (await call("/v1/usernames/bia", biaToken)).json()).toEqual({ available: true });
  });
});

describe("limite de requisições e CORS", () => {
  it("bloqueia com 429 depois do limite por usuário", async () => {
    const limited = await createTestHarness({ rateLimitPerMinute: 3 });
    try {
      const token = await limited.signIn(CAIO);
      const request = async (): Promise<TestResponse> =>
        limited.app.request("/v1/me", { headers: { authorization: `Bearer ${token}` } });
      for (let i = 0; i < 3; i += 1) expect((await request()).status).toBe(200);
      const blocked = await request();
      expect(blocked.status).toBe(429);
      expect(blocked.headers.get("retry-after")).toBeTruthy();
      expect((await blocked.json()).error.code).toBe("rate_limited");
    } finally {
      await limited.close();
    }
  });

  it("só libera o CORS para as origens configuradas", async () => {
    const allowed = await call("/health", undefined, { headers: { origin: "http://localhost:3000" } });
    expect(allowed.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");

    const denied = await call("/health", undefined, { headers: { origin: "https://site-malicioso.example" } });
    expect(denied.headers.get("access-control-allow-origin")).toBeNull();
  });
});
