import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { secureHeaders } from "hono/secure-headers";
import { requireAuth } from "./auth";
import { ApiFailure } from "./errors";
import { clientIp, rateLimit } from "./rate-limit";
import { dishRoutes } from "./routes/dishes";
import { logRoutes } from "./routes/logs";
import { placesRoutes } from "./routes/places";
import { profileRoutes } from "./routes/profiles";
import { ratingRoutes } from "./routes/ratings";
import { restaurantRoutes } from "./routes/restaurants";
import { titleRoutes } from "./routes/titles";
import { visitRoutes } from "./routes/visits";
import { wishlistRoutes } from "./routes/wishlist";
import type { AppDeps, AppEnv } from "./types";

export function createApp(deps: AppDeps) {
  const app = new Hono<AppEnv>();
  const perMinute = deps.rateLimitPerMinute ?? 120;

  app.use(secureHeaders());
  app.use(
    cors({
      origin: deps.webOrigins,
      allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
      allowHeaders: ["Authorization", "Content-Type"],
      exposeHeaders: ["RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset", "Retry-After"],
      maxAge: 600,
    }),
  );
  app.use(bodyLimit({ maxSize: 256 * 1024 }));

  app.get("/health", (c) =>
    c.json({ ok: true, service: "pap-api", commit: deps.commit ?? null, time: new Date().toISOString() }),
  );

  const v1 = new Hono<AppEnv>();
  // Antes da autenticação: segura rajadas (e tentativas com token inválido) por IP.
  v1.use(rateLimit({ windowMs: 60_000, max: perMinute * 3, key: (c) => `ip:${clientIp(c)}` }));
  v1.use(requireAuth(deps.verifyToken));
  v1.use(rateLimit({ windowMs: 60_000, max: perMinute, key: (c) => `user:${c.get("user").id}` }));
  v1.route("/", profileRoutes(deps));
  v1.route("/", placesRoutes(deps));
  v1.route("/", restaurantRoutes(deps));
  v1.route("/", dishRoutes(deps));
  v1.route("/", visitRoutes(deps));
  v1.route("/", ratingRoutes(deps));
  v1.route("/", wishlistRoutes(deps));
  v1.route("/", titleRoutes(deps));
  v1.route("/", logRoutes(deps));
  app.route("/v1", v1);

  app.notFound((c) => c.json({ error: { code: "not_found", message: "Rota não encontrada." } }, 404));

  app.onError((error, c) => {
    if (error instanceof ApiFailure) return c.json(error.toBody(), error.status);
    if (error instanceof HTTPException) {
      const message = error.status === 413 ? "Requisição grande demais." : "Não foi possível processar a requisição.";
      return c.json({ error: { code: "http_error", message } }, error.status);
    }
    console.error("Erro inesperado:", error);
    return c.json({ error: { code: "internal_error", message: "Algo deu errado do nosso lado. Tente de novo." } }, 500);
  });

  return app;
}

export type App = ReturnType<typeof createApp>;
