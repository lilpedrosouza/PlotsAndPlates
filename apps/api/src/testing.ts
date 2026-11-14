import { type TestDb, createTestDb } from "@pap/db/testing";
import { type CryptoKey, SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";
import { createApp } from "./app";
import { createJwksVerifier } from "./auth";
import { createFindExisting } from "./places/existing";
import { OFFLINE_ROUTES, fakeFetch } from "./places/fixtures";
import { createOsm } from "./places/osm";
import { createPlacesService } from "./places/service";
import { createCatalog } from "./tmdb/catalog";
import { createTmdbClient } from "./tmdb/client";
import { tmdbFakeFetch } from "./tmdb/fixtures";
import type { MediaStorage } from "./storage";
import type { AppDeps } from "./types";

export const TEST_ISSUER = "https://pap-test.supabase.co/auth/v1";
export const TEST_MEDIA_BASE = "https://pap-test.supabase.co/storage/v1/object/public/media";

type TokenOverrides = {
  issuer?: string;
  audience?: string;
  role?: string;
  expiresIn?: string;
  isAnonymous?: boolean;
};

export type TestHarness = {
  app: ReturnType<typeof createApp>;
  test: TestDb;
  removed: string[];
  /** Cria a conta em auth.users e devolve um access token válido para ela. */
  signIn: (id: string, email?: string) => Promise<string>;
  /** Assina um token sem criar conta (para testar tokens inválidos). */
  signToken: (id: string, overrides?: TokenOverrides) => Promise<string>;
  /** Assina um token com uma chave que a API não conhece. */
  signWithUnknownKey: (id: string) => Promise<string>;
  close: () => Promise<void>;
};

/**
 * Sobe a API inteira em memória: Postgres (PGlite) com migrations e RLS, e um
 * JWKS local que assina tokens no mesmo formato do Supabase Auth.
 */
export async function createTestHarness(overrides: Partial<AppDeps> = {}): Promise<TestHarness> {
  const test = await createTestDb();

  const { publicKey, privateKey } = await generateKeyPair("ES256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "test-key", alg: "ES256", use: "sig" };
  const verifyToken = createJwksVerifier(createLocalJWKSet({ keys: [jwk] }), TEST_ISSUER);
  const unknown = await generateKeyPair("ES256");

  const removed: string[] = [];
  const storage: MediaStorage = {
    bucket: "media",
    createSignedUpload: async (path) => ({ token: `token-for:${path}` }),
    publicUrl: (path) => `${TEST_MEDIA_BASE}/${path}`,
    remove: async (paths) => {
      removed.push(...paths);
    },
  };

  const sign = (key: CryptoKey, kid: string, id: string, options: TokenOverrides = {}) =>
    new SignJWT({
      role: options.role ?? "authenticated",
      email: `${id}@pap.test`,
      is_anonymous: options.isAnonymous ?? false,
    })
      .setProtectedHeader({ alg: "ES256", kid })
      .setSubject(id)
      .setIssuer(options.issuer ?? TEST_ISSUER)
      .setAudience(options.audience ?? "authenticated")
      .setIssuedAt()
      .setExpirationTime(options.expiresIn ?? "1h")
      .sign(key);

  // Sem Google por padrão; o OpenStreetMap responde com as fixtures, sem rede.
  const places = createPlacesService({
    google: null,
    osm: createOsm({ fetch: fakeFetch(OFFLINE_ROUTES).fetch, sleep: async () => {} }),
    findExisting: createFindExisting(test.db),
  });

  // TMDB falso (respostas de exemplo), sem rede.
  const tmdb = createCatalog({ db: test.db, client: createTmdbClient({ token: "test", fetch: tmdbFakeFetch().fetch }) });

  const app = createApp({
    db: test.db,
    tmdb,
    verifyToken,
    storage,
    places,
    webOrigins: ["http://localhost:3000"],
    ...overrides,
  });

  return {
    app,
    test,
    removed,
    signIn: async (id, email) => {
      await test.createAuthUser(id, email);
      return sign(privateKey, "test-key", id);
    },
    signToken: (id, options) => sign(privateKey, "test-key", id, options),
    signWithUnknownKey: (id) => sign(unknown.privateKey, "test-key", id),
    close: test.close,
  };
}
