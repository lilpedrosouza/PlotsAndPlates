import { titles, withUser } from "@pap/db";
import { kindInputSchema, tmdbSearchQuerySchema } from "@pap/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { ApiFailure, badRequest, notFound } from "../errors";
import { loadTitleDetail, summaryOf } from "../plots/queries";
import { rateLimit } from "../rate-limit";
import { TmdbNotFound, TmdbUnavailable } from "../tmdb/client";
import type { AppDeps, AppEnv } from "../types";
import { validate } from "../validate";
import { routeId } from "./restaurants";

const SEARCH_PER_MINUTE = 60;

export const tmdbUnavailable = (message = "A busca de filmes e séries não está disponível agora.") =>
  new ApiFailure(503, "tmdb_unavailable", message);

/** Converte os erros do TMDB nos erros da API. */
export function tmdbError(error: unknown): never {
  if (error instanceof TmdbNotFound) throw notFound("Título não encontrado.");
  if (error instanceof TmdbUnavailable) throw tmdbUnavailable(error.message);
  throw error;
}

/** Busca no TMDB e catálogo de títulos (os dados do TMDB guardados no PAP). */
export function titleRoutes(deps: Pick<AppDeps, "db" | "tmdb">) {
  const { db, tmdb } = deps;
  const app = new Hono<AppEnv>();

  app.use("/tmdb/*", rateLimit({ windowMs: 60_000, max: SEARCH_PER_MINUTE, key: (c) => `tmdb:${c.get("user").id}` }));

  app.get("/tmdb/search", validate("query", tmdbSearchQuerySchema), async (c) => {
    const { q, page } = c.req.valid("query");
    try {
      return c.json({ results: await tmdb.search(q, page) });
    } catch (error) {
      tmdbError(error);
    }
  });

  /** Garante o título no catálogo e devolve o id do PAP. */
  app.get("/titles/by-tmdb/:type/:tmdbId", async (c) => {
    const type = c.req.param("type");
    const tmdbId = Number(c.req.param("tmdbId"));
    if ((type !== "movie" && type !== "tv") || !Number.isInteger(tmdbId) || tmdbId <= 0) {
      throw badRequest("Título inválido.");
    }
    try {
      return c.json({ id: await tmdb.ensure(type, tmdbId) });
    } catch (error) {
      tmdbError(error);
    }
  });

  app.get("/titles/:id", async (c) => {
    const user = c.get("user");
    const id = routeId(c.req.param("id"));
    // Atualiza com o TMDB se o que está guardado tiver mais de 30 dias.
    await tmdb.refreshIfStale(id);
    const detail = await withUser(db, { sub: user.id }, (tx) => loadTitleDetail({ tx, userId: user.id }, id));
    if (!detail) throw notFound("Título não encontrado.");
    return c.json(detail);
  });

  /** Troca o tipo (ex.: marcar como "especial"). O catálogo é público; o tipo é só um rótulo. */
  app.patch("/titles/:id/kind", validate("json", kindInputSchema), async (c) => {
    const id = routeId(c.req.param("id"));
    const { kind } = c.req.valid("json");
    // Gravado pela API (dona do catálogo): quem está logado não grava direto em titles.
    const [row] = await db.update(titles).set({ kind }).where(eq(titles.id, id)).returning();
    if (!row) throw notFound("Título não encontrado.");
    return c.json(summaryOf(row));
  });

  return app;
}
