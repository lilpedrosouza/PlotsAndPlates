/**
 * MODO LOCAL — só para desenvolvimento e demonstração.
 *
 * Sobe a API de verdade em cima de um Postgres em memória (PGlite) e imita o
 * mínimo do Supabase de que o site precisa: login por e-mail e senha
 * (/auth/v1) e Storage (/storage/v1). Assim dá para rodar o PAP inteiro sem
 * criar conta em lugar nenhum. Os dados somem quando o processo termina.
 *
 * Nunca use em produção: as senhas ficam em memória, sem hash.
 */
import { randomBytes, randomUUID } from "node:crypto";
import { serve } from "@hono/node-server";
import { profiles } from "@pap/db";
import { createTestDb } from "@pap/db/testing";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";
import { createApp } from "../app";
import { createJwksVerifier } from "../auth";
import { createFindExisting } from "../places/existing";
import { OFFLINE_ROUTES, fakeFetch } from "../places/fixtures";
import { createOsm } from "../places/osm";
import { createPlacesService } from "../places/service";
import type { MediaStorage } from "../storage";
import { seedPlatesDemo } from "./plates-demo";

const PORT = Number(process.env.PORT ?? 8787);
const ORIGIN = `http://localhost:${PORT}`;
const ISSUER = `${ORIGIN}/auth/v1`;
const WEB_ORIGINS = (process.env.WEB_ORIGINS ?? "http://localhost:3000").split(",");
const BUCKET = "media";
const TOKEN_TTL_SECONDS = 3600;

type Account = { id: string; email: string; password: string; createdAt: string };

const accounts = new Map<string, Account>();
const refreshTokens = new Map<string, string>();
const files = new Map<string, { bytes: Uint8Array; contentType: string }>();
const uploadTokens = new Map<string, string>();

const { db, createAuthUser } = await createTestDb();
const { publicKey, privateKey } = await generateKeyPair("ES256");
const jwk = { ...(await exportJWK(publicKey)), kid: "pap-local", alg: "ES256", use: "sig" };

const toUser = (account: Account) => ({
  id: account.id,
  aud: "authenticated",
  role: "authenticated",
  email: account.email,
  email_confirmed_at: account.createdAt,
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  identities: [],
  created_at: account.createdAt,
  updated_at: account.createdAt,
  is_anonymous: false,
});

async function createSession(account: Account) {
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const accessToken = await new SignJWT({ role: "authenticated", email: account.email, is_anonymous: false })
    .setProtectedHeader({ alg: "ES256", kid: "pap-local" })
    .setSubject(account.id)
    .setIssuer(ISSUER)
    .setAudience("authenticated")
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(privateKey);
  const refreshToken = randomBytes(24).toString("base64url");
  refreshTokens.set(refreshToken, account.id);
  return {
    access_token: accessToken,
    token_type: "bearer",
    expires_in: TOKEN_TTL_SECONDS,
    expires_at: expiresAt,
    refresh_token: refreshToken,
    user: toUser(account),
  };
}

async function register(email: string, password: string): Promise<Account> {
  const account: Account = { id: randomUUID(), email, password, createdAt: new Date().toISOString() };
  accounts.set(email, account);
  await createAuthUser(account.id, email);
  return account;
}

const authError = (errorCode: string, message: string) => ({ code: 400, error_code: errorCode, msg: message });

const storage: MediaStorage = {
  bucket: BUCKET,
  createSignedUpload: async (path) => {
    const token = randomBytes(16).toString("hex");
    uploadTokens.set(token, path);
    return { token };
  },
  publicUrl: (path) => `${ORIGIN}/storage/v1/object/public/${BUCKET}/${path}`,
  remove: async (paths) => {
    for (const path of paths) files.delete(path);
  },
};

const verifyToken = createJwksVerifier(createLocalJWKSet({ keys: [jwk] }), ISSUER);

const server = new Hono();

server.use(
  "/auth/*",
  cors({ origin: WEB_ORIGINS, allowHeaders: ["*"], allowMethods: ["GET", "POST", "PUT", "DELETE"] }),
);
server.use(
  "/storage/*",
  cors({ origin: WEB_ORIGINS, allowHeaders: ["*"], allowMethods: ["GET", "POST", "PUT", "DELETE"] }),
);

// --- Auth (subconjunto do GoTrue) ---------------------------------------

server.get("/auth/v1/.well-known/jwks.json", (c) => c.json({ keys: [jwk] }));

server.post("/auth/v1/signup", async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  if (!/^\S+@\S+\.\S+$/.test(email)) return c.json(authError("validation_failed", "Invalid email"), 400);
  if (password.length < 6) return c.json(authError("weak_password", "Password should be at least 6 characters"), 422);
  if (accounts.has(email)) return c.json(authError("user_already_exists", "User already registered"), 422);
  return c.json(await createSession(await register(email, password)));
});

server.post("/auth/v1/token", async (c) => {
  const grant = c.req.query("grant_type");
  const body = await c.req.json<{ email?: string; password?: string; refresh_token?: string }>();

  if (grant === "password") {
    const account = accounts.get(body.email?.trim().toLowerCase() ?? "");
    if (!account || account.password !== body.password) {
      return c.json(authError("invalid_credentials", "Invalid login credentials"), 400);
    }
    return c.json(await createSession(account));
  }

  if (grant === "refresh_token") {
    const accountId = refreshTokens.get(body.refresh_token ?? "");
    const account = [...accounts.values()].find((candidate) => candidate.id === accountId);
    if (!account) return c.json(authError("refresh_token_not_found", "Invalid Refresh Token"), 400);
    refreshTokens.delete(body.refresh_token ?? "");
    return c.json(await createSession(account));
  }

  return c.json(authError("unsupported_grant_type", "Unsupported grant type"), 400);
});

server.get("/auth/v1/user", async (c) => {
  try {
    const user = await verifyToken((c.req.header("authorization") ?? "").replace(/^Bearer\s+/i, ""));
    const account = [...accounts.values()].find((candidate) => candidate.id === user.id);
    if (!account) throw new Error("conta inexistente");
    return c.json(toUser(account));
  } catch {
    return c.json({ code: 401, error_code: "bad_jwt", msg: "Invalid JWT" }, 401);
  }
});

server.post("/auth/v1/logout", (c) => c.body(null, 204));

server.get("/auth/v1/authorize", (c) =>
  c.text("O login com Google não existe no modo local. Use e-mail e senha.", 501),
);

// --- Storage (upload assinado + leitura pública) -------------------------

server.put("/storage/v1/object/upload/sign/:bucket/*", async (c) => {
  const path = c.req.path.split(`/upload/sign/${c.req.param("bucket")}/`)[1] ?? "";
  const token = c.req.query("token") ?? "";
  if (uploadTokens.get(token) !== path) return c.json({ error: "InvalidJWT", message: "token inválido" }, 400);
  uploadTokens.delete(token);

  const contentType = c.req.header("content-type") ?? "";
  if (contentType.startsWith("multipart/form-data")) {
    const form = await c.req.formData();
    const file = [...form.values()].find((value) => typeof value !== "string");
    if (typeof file === "string") return c.json({ error: "InvalidRequest", message: "arquivo ausente" }, 400);
    if (!file) return c.json({ error: "InvalidRequest", message: "arquivo ausente" }, 400);
    files.set(path, { bytes: new Uint8Array(await file.arrayBuffer()), contentType: file.type || "image/webp" });
  } else {
    files.set(path, { bytes: new Uint8Array(await c.req.arrayBuffer()), contentType: contentType || "image/webp" });
  }
  return c.json({ Key: `${c.req.param("bucket")}/${path}` });
});

server.get("/storage/v1/object/public/:bucket/*", (c) => {
  const path = c.req.path.split(`/object/public/${c.req.param("bucket")}/`)[1] ?? "";
  const file = files.get(path);
  if (!file) return c.json({ error: "not_found" }, 404);
  return c.body(file.bytes.buffer as ArrayBuffer, 200, {
    "content-type": file.contentType,
    "cache-control": "public, max-age=31536000, immutable",
  });
});

// --- API de verdade --------------------------------------------------------

// Sem chave do Google: a busca usa o OpenStreetMap de verdade (precisa de
// internet). Com PAP_OFFLINE=1, responde com dados de exemplo.
const offline = process.env.PAP_OFFLINE === "1";
const places = createPlacesService({
  google: null,
  osm: createOsm(offline ? { fetch: fakeFetch(OFFLINE_ROUTES).fetch, sleep: async () => {} } : {}),
  findExisting: createFindExisting(db),
});

server.route("/", createApp({ db, verifyToken, storage, places, webOrigins: WEB_ORIGINS, rateLimitPerMinute: 600 }));

// --- Dados de exemplo ------------------------------------------------------

const DEMO_PASSWORD = "papdemo";
const demo = [
  { email: "ana@pap.local", username: "ana", displayName: "Ana Souza", bio: "Sempre pede sobremesa.", accent: "oliva" },
  { email: "bia@pap.local", username: "bia", displayName: "Bia Lima", bio: "Chora em animação.", accent: "padrao" },
];
const demoIds: Record<string, string> = {};
for (const person of demo) {
  const account = await register(person.email, DEMO_PASSWORD);
  demoIds[person.username] = account.id;
  await db.insert(profiles).values({
    id: account.id,
    username: person.username,
    displayName: person.displayName,
    bio: person.bio,
    accent: person.accent,
    streamings: ["netflix", "mubi"],
  });
}

await seedPlatesDemo(db, { ana: demoIds.ana!, bia: demoIds.bia! });

serve({ fetch: server.fetch, port: PORT, hostname: "0.0.0.0" }, () => {
  console.log(`\nPAP em MODO LOCAL — ${ORIGIN}`);
  console.log("Banco em memória e Supabase de mentira: os dados somem ao encerrar.\n");
  console.log("Contas de exemplo (senha: papdemo):");
  for (const person of demo) console.log(`  ${person.email}  →  @${person.username}`);
  console.log("\nOu crie uma conta nova pela tela de cadastro.");
  console.log(
    offline
      ? "Busca de restaurantes: dados de exemplo (PAP_OFFLINE=1).\n"
      : "Busca de restaurantes: OpenStreetMap de verdade (precisa de internet). Sem internet, use PAP_OFFLINE=1.\n",
  );
});
