import { favoriteTitles, plotsWatchlist, profiles, titles, withUser } from "@pap/db";
import {
  STREAMINGS,
  type WatchlistItem,
  favoritesInputSchema,
  logInputSchema,
  plotsWatchlistInputSchema,
  watchlistQuerySchema,
} from "@pap/shared";
import { and, asc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { badRequest, conflict, notFound } from "../errors";
import { peopleById } from "../couples/partner";
import { findTitle, summaryOf } from "../plots/queries";
import type { AppDeps, AppEnv } from "../types";
import { validate } from "../validate";
import { insertLog, writeMirror } from "./logs";
import { routeId } from "./restaurants";

/** Ids de serviço do TMDB dos streamings marcados no perfil. */
async function myProviderIds(tx: Parameters<Parameters<typeof withUser>[2]>[0], userId: string): Promise<Set<number>> {
  const [profile] = await tx.select({ streamings: profiles.streamings }).from(profiles).where(eq(profiles.id, userId));
  const keys = new Set(profile?.streamings ?? []);
  return new Set(STREAMINGS.filter((streaming) => keys.has(streaming.key)).map((streaming) => streaming.tmdbProviderId));
}

/** "Quero ver", "Assistimos!" e o Top 4. */
export function plotsWatchlistRoutes(deps: Pick<AppDeps, "db" | "storage">) {
  const { db, storage } = deps;
  const app = new Hono<AppEnv>();

  app.put("/titles/:id/watchlist", validate("json", plotsWatchlistInputSchema), async (c) => {
    const user = c.get("user");
    const titleId = routeId(c.req.param("id"));
    const { note } = c.req.valid("json");
    await withUser(db, { sub: user.id }, async (tx) => {
      if (!(await findTitle(tx, titleId))) throw notFound("Título não encontrado.");
      await tx
        .insert(plotsWatchlist)
        .values({ userId: user.id, titleId, note })
        .onConflictDoUpdate({ target: [plotsWatchlist.userId, plotsWatchlist.titleId], set: { note } });
    });
    return c.json({ inWatchlist: true, note });
  });

  app.delete("/titles/:id/watchlist", async (c) => {
    const user = c.get("user");
    const titleId = routeId(c.req.param("id"));
    // Quero ver do casal: tira as linhas dos dois (o RLS limita a quem vê e ao par).
    await withUser(db, { sub: user.id }, (tx) => tx.delete(plotsWatchlist).where(eq(plotsWatchlist.titleId, titleId)));
    return c.body(null, 204);
  });

  app.get("/watchlist", validate("query", watchlistQuerySchema), async (c) => {
    const user = c.get("user");
    const { onlyMine, kind, sort } = c.req.valid("query");
    const items = await withUser(db, { sub: user.id }, async (tx) => {
      const providers = await myProviderIds(tx, user.id);
      // As linhas dos dois (o RLS limita a quem vê e ao par), uma por título.
      const rows = await tx
        .select({ item: plotsWatchlist, title: titles })
        .from(plotsWatchlist)
        .innerJoin(titles, eq(titles.id, plotsWatchlist.titleId))
        .where(kind ? eq(titles.kind, kind) : undefined)
        .orderBy(asc(plotsWatchlist.createdAt));
      const people = await peopleById(tx, rows.map(({ item }) => item.userId), storage);
      const byTitle = new Map<string, WatchlistItem>();
      for (const { item, title } of rows) {
        const person = people.get(item.userId);
        const existing = byTitle.get(title.id);
        if (existing) {
          if (person) existing.addedBy.push(person);
          if (item.note) existing.note = existing.note ? `${existing.note} · ${item.note}` : item.note;
          continue;
        }
        byTitle.set(title.id, {
          title: summaryOf(title),
          note: item.note,
          addedAt: item.createdAt.toISOString(),
          onMyStreamings: (title.providers?.flatrate ?? []).filter((provider) => providers.has(provider.id)),
          addedBy: person ? [person] : [],
        });
      }
      const mapped = [...byTitle.values()];
      const filtered = onlyMine ? mapped.filter((item) => item.onMyStreamings.length > 0) : mapped;
      return filtered.sort((a, b) =>
        sort === "titulo" ? a.title.title.localeCompare(b.title.title, "pt-BR") : b.addedAt.localeCompare(a.addedAt),
      );
    });
    return c.json({ items });
  });

  /** "Assistimos!": registra no diário e tira do quero ver, na mesma transação. */
  app.post("/titles/:id/assistimos", validate("json", logInputSchema), async (c) => {
    const user = c.get("user");
    const titleId = routeId(c.req.param("id"));
    const input = c.req.valid("json");
    const log = await withUser(db, { sub: user.id }, async (tx) => {
      const ctx = { tx, userId: user.id };
      const title = await findTitle(tx, titleId);
      if (!title) throw notFound("Título não encontrado.");
      // Tira do quero ver do casal (as linhas dos dois).
      const removed = await tx
        .delete(plotsWatchlist)
        .where(eq(plotsWatchlist.titleId, titleId))
        .returning({ id: plotsWatchlist.id });
      if (removed.length === 0) throw conflict("not_in_watchlist", "Esse título não está no seu quero ver.");
      return insertLog(ctx, title, input);
    });
    await writeMirror(db, log.mirror);
    return c.json({ log: log.log }, 201);
  });

  const loadFavorites = (tx: Parameters<Parameters<typeof withUser>[2]>[0], userId: string) =>
    tx
      .select({ title: titles })
      .from(favoriteTitles)
      .innerJoin(titles, eq(titles.id, favoriteTitles.titleId))
      .where(eq(favoriteTitles.userId, userId))
      .orderBy(asc(favoriteTitles.position));

  app.get("/me/favorites", async (c) => {
    const user = c.get("user");
    const rows = await withUser(db, { sub: user.id }, (tx) => loadFavorites(tx, user.id));
    return c.json({ titles: rows.map((row) => summaryOf(row.title)) });
  });

  /** Top 4: substitui a lista inteira, na ordem enviada. */
  app.put("/me/favorites", validate("json", favoritesInputSchema), async (c) => {
    const user = c.get("user");
    const { titleIds } = c.req.valid("json");
    const rows = await withUser(db, { sub: user.id }, async (tx) => {
      if (titleIds.length > 0) {
        const found = await tx.select({ id: titles.id }).from(titles).where(inArray(titles.id, titleIds));
        if (found.length !== titleIds.length) throw badRequest("Algum título não existe.", { titleIds: "Título inválido." });
      }
      await tx.delete(favoriteTitles).where(eq(favoriteTitles.userId, user.id));
      if (titleIds.length > 0) {
        await tx.insert(favoriteTitles).values(titleIds.map((titleId, index) => ({ userId: user.id, titleId, position: index + 1 })));
      }
      return loadFavorites(tx, user.id);
    });
    return c.json({ titles: rows.map((row) => summaryOf(row.title)) });
  });

  return app;
}
