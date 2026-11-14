import type { Context, MiddlewareHandler } from "hono";
import { ApiFailure } from "./errors";
import type { AppEnv } from "./types";

type Bucket = { count: number; resetAt: number };

export type RateLimitOptions = {
  windowMs: number;
  max: number;
  /** Identifica o cliente (id do usuário ou IP). */
  key: (c: Context<AppEnv>) => string;
  now?: () => number;
};

/**
 * Limite de requisições por janela fixa, em memória. A API roda em uma única
 * instância na Railway, então não precisa de armazenamento compartilhado.
 */
export function rateLimit(options: RateLimitOptions): MiddlewareHandler<AppEnv> {
  const buckets = new Map<string, Bucket>();
  const now = options.now ?? Date.now;

  return async (c, next) => {
    const time = now();
    if (buckets.size > 5_000) {
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= time) buckets.delete(key);
      }
    }

    const key = options.key(c);
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= time) {
      bucket = { count: 0, resetAt: time + options.windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;

    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - time) / 1000));
    c.header("RateLimit-Limit", String(options.max));
    c.header("RateLimit-Remaining", String(Math.max(0, options.max - bucket.count)));
    c.header("RateLimit-Reset", String(retryAfter));

    if (bucket.count > options.max) {
      c.header("Retry-After", String(retryAfter));
      throw new ApiFailure(429, "rate_limited", "Muitas requisições em pouco tempo. Tente de novo em instantes.");
    }
    await next();
  };
}

/** IP do cliente atrás do proxy da Railway. */
export function clientIp(c: Context): string {
  const forwarded = c.req.header("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "desconhecido";
}
