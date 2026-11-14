import type { MiddlewareHandler } from "hono";
import { type JWTVerifyGetKey, createRemoteJWKSet, jwtVerify } from "jose";
import { unauthorized } from "./errors";
import type { AppEnv } from "./types";

export type AuthUser = {
  id: string;
  email: string | null;
};

export type TokenVerifier = (token: string) => Promise<AuthUser>;

/**
 * Valida um access token do Supabase Auth contra um conjunto de chaves (JWKS).
 * Confere assinatura, emissor, público, validade e que é um usuário de verdade
 * (não anônimo).
 */
export function createJwksVerifier(keys: JWTVerifyGetKey, issuer: string): TokenVerifier {
  return async (token) => {
    const { payload } = await jwtVerify(token, keys, {
      issuer,
      audience: "authenticated",
      algorithms: ["ES256", "RS256", "EdDSA"],
    });
    if (typeof payload.sub !== "string" || payload.role !== "authenticated" || payload.is_anonymous === true) {
      throw new Error("Token sem usuário autenticado.");
    }
    return { id: payload.sub, email: typeof payload.email === "string" ? payload.email : null };
  };
}

/** Verificador ligado ao JWKS público do projeto Supabase (com cache das chaves). */
export function createSupabaseVerifier(supabaseUrl: string): TokenVerifier {
  const issuer = `${supabaseUrl}/auth/v1`;
  const keys = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`), {
    cooldownDuration: 30_000,
    cacheMaxAge: 10 * 60_000,
  });
  return createJwksVerifier(keys, issuer);
}

/** Exige `Authorization: Bearer <token>` válido e publica o usuário no contexto. */
export function requireAuth(verify: TokenVerifier): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const header = c.req.header("authorization") ?? "";
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (!match?.[1]) throw unauthorized();

    let user: AuthUser;
    try {
      user = await verify(match[1]);
    } catch {
      throw unauthorized("Sua sessão expirou. Entre de novo.");
    }
    c.set("user", user);
    await next();
  };
}
