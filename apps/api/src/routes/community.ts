import { profiles, restaurantRatings, restaurants, titleRatings, titles, watchLogs, withUser } from "@pap/db";
import { type CommunityPage, communityQuerySchema, communityRating } from "@pap/shared";
import { type SQL, and, desc, eq, isNotNull, ne, notInArray, or } from "drizzle-orm";
import { Hono } from "hono";
import { partnerOf, personRef } from "../couples/partner";
import { notFound } from "../errors";
import { decodeCursor, encodeCursor } from "../plates/cursor";
import type { AppDeps, AppEnv } from "../types";
import { validate } from "../validate";

/** Quem não entra na comunidade: você e seu par. */
const outsiders = (userId: string, partner: string | null) => (partner ? [userId, partner] : [userId]);

/**
 * "O que o pessoal do PAP achou": só avaliações públicas de quem não é você
 * nem seu par. A média usa a nota atual de cada pessoa (uma por pessoa); a
 * lista mostra as avaliações mais recentes, de 10 em 10.
 */
export function communityRoutes({ db, storage }: Pick<AppDeps, "db" | "storage">) {
  const app = new Hono<AppEnv>();

  app.get("/restaurants/:id/community", validate("query", communityQuerySchema), async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const { cursor, limit } = c.req.valid("query");
    const offset = decodeCursor(cursor);

    const page = await withUser(db, { sub: user.id }, async (tx) => {
      const [restaurant] = await tx.select({ id: restaurants.id }).from(restaurants).where(eq(restaurants.id, id));
      if (!restaurant) throw notFound("Restaurante não encontrado.");
      const excluded = outsiders(user.id, await partnerOf(tx, user.id));
      const visible: SQL[] = [
        eq(restaurantRatings.restaurantId, id),
        eq(restaurantRatings.isPrivate, false),
        notInArray(restaurantRatings.userId, excluded),
      ];
      const all = await tx
        .select({ overall: restaurantRatings.overall })
        .from(restaurantRatings)
        .where(and(...visible));
      const rows = await tx
        .select({ rating: restaurantRatings, person: profiles })
        .from(restaurantRatings)
        .innerJoin(profiles, eq(profiles.id, restaurantRatings.userId))
        .where(and(...visible))
        .orderBy(desc(restaurantRatings.updatedAt), desc(restaurantRatings.id))
        .limit(limit + 1)
        .offset(offset);
      const summary = communityRating(all.map((row) => (row.overall == null ? null : Number(row.overall))));
      const body: CommunityPage = {
        ...summary,
        items: rows.slice(0, limit).map(({ rating, person }) => ({
          person: personRef(person, storage),
          rating: rating.overall == null ? null : Number(rating.overall),
          review: rating.review,
          date: rating.updatedAt.toISOString(),
        })),
        nextCursor: rows.length > limit ? encodeCursor(offset + limit) : null,
      };
      return body;
    });
    return c.json(page);
  });

  app.get("/titles/:id/community", validate("query", communityQuerySchema), async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const { cursor, limit } = c.req.valid("query");
    const offset = decodeCursor(cursor);

    const page = await withUser(db, { sub: user.id }, async (tx) => {
      const [title] = await tx.select({ id: titles.id }).from(titles).where(eq(titles.id, id));
      if (!title) throw notFound("Título não encontrado.");
      const excluded = outsiders(user.id, await partnerOf(tx, user.id));
      const all = await tx
        .select({ rating: titleRatings.rating })
        .from(titleRatings)
        .where(and(eq(titleRatings.titleId, id), eq(titleRatings.isPrivate, false), notInArray(titleRatings.userId, excluded)));
      // Sessão sem nota e sem texto (como o registro espelhado do par) não diz nada.
      const rows = await tx
        .select({ log: watchLogs, person: profiles })
        .from(watchLogs)
        .innerJoin(profiles, eq(profiles.id, watchLogs.userId))
        .where(
          and(
            eq(watchLogs.titleId, id),
            eq(watchLogs.isPrivate, false),
            notInArray(watchLogs.userId, excluded),
            or(isNotNull(watchLogs.rating), ne(watchLogs.review, "")),
          ),
        )
        .orderBy(desc(watchLogs.watchedOn), desc(watchLogs.createdAt), desc(watchLogs.id))
        .limit(limit + 1)
        .offset(offset);
      const summary = communityRating(all.map((row) => (row.rating == null ? null : Number(row.rating))));
      const body: CommunityPage = {
        ...summary,
        items: rows.slice(0, limit).map(({ log, person }) => ({
          person: personRef(person, storage),
          rating: log.rating == null ? null : Number(log.rating),
          review: log.review,
          date: log.watchedOn,
          seasonNumber: log.seasonNumber,
        })),
        nextCursor: rows.length > limit ? encodeCursor(offset + limit) : null,
      };
      return body;
    });
    return c.json(page);
  });

  return app;
}
