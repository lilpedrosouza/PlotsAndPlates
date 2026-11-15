import {
  type Db,
  type Profile,
  favoriteTitles,
  profiles,
  restaurantRatings,
  restaurants,
  titleRatings,
  titles,
  visits,
  watchLogs,
  withUser,
} from "@pap/db";
import { type PublicPlatesProfile, type PublicPlotsProfile, mean, thumbPathOf } from "@pap/shared";
import { type SQL, and, asc, countDistinct, count, desc, eq, isNotNull, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { partnerOf } from "../couples/partner";
import { notFound } from "../errors";
import type { AppDeps, AppEnv } from "../types";
import { toPublicProfile } from "./profiles";

const RECENT = 6;
const FAVORITES = 4;

const toNumber = (value: string | null) => (value == null ? null : Number(value));

/** Perfil pelo @username, 404 se não existe. */
async function findProfile(db: Db, viewerId: string, username: string): Promise<Profile> {
  const [row] = await withUser(db, { sub: viewerId }, (tx) =>
    tx.select().from(profiles).where(eq(profiles.username, username.toLowerCase())).limit(1),
  );
  if (!row) throw notFound("Não achamos ninguém com esse @username.");
  return row;
}

/**
 * Perfis públicos (só leitura). As contagens de visitas vêm da conexão da API, porque
 * visitas não são visíveis a terceiros e só o número aparece; notas, reviews e
 * sessões passam pela RLS e por um filtro explícito: quem é de fora vê só o
 * público, o par e a própria pessoa veem também o privado.
 */
export function publicProfileRoutes({ db, storage }: Pick<AppDeps, "db" | "storage">) {
  const app = new Hono<AppEnv>();

  app.get("/profiles/:username/plates", async (c) => {
    const user = c.get("user");
    const person = await findProfile(db, user.id, c.req.param("username"));
    const personPartner = await partnerOf(db, person.id);
    const isPartner = personPartner !== null && personPartner === user.id;
    const seesPrivate = isPartner || person.id === user.id;

    // Visitas da pessoa: as que ela registrou e as "juntos" registradas pelo par.
    const hers: SQL = personPartner
      ? (or(
          eq(visits.userId, person.id),
          and(eq(visits.together, true), eq(visits.userId, personPartner), eq(visits.togetherWith, person.id)),
        ) as SQL)
      : eq(visits.userId, person.id);
    const [visitStats] = await db
      .select({ visits: count(), restaurants: countDistinct(visits.restaurantId) })
      .from(visits)
      .where(hers);

    const coverPath = sql<string | null>`coalesce(${restaurants.coverPath}, (
      select p.path from public.restaurant_photos p
      where p.restaurant_id = ${restaurants.id}
      order by p.position, p.created_at limit 1))`;

    const body = await withUser(db, { sub: user.id }, async (tx) => {
      const visible: SQL[] = [eq(restaurantRatings.userId, person.id)];
      if (!seesPrivate) visible.push(eq(restaurantRatings.isPrivate, false));
      const ratings = await tx
        .select({ overall: restaurantRatings.overall })
        .from(restaurantRatings)
        .where(and(...visible, isNotNull(restaurantRatings.overall)));
      // Favoritos: maior nota geral, só avaliações públicas (decisão de 2026-11-14).
      const favorites = await tx
        .select({ id: restaurants.id, name: restaurants.name, coverPath, overall: restaurantRatings.overall })
        .from(restaurantRatings)
        .innerJoin(restaurants, eq(restaurants.id, restaurantRatings.restaurantId))
        .where(
          and(eq(restaurantRatings.userId, person.id), eq(restaurantRatings.isPrivate, false), isNotNull(restaurantRatings.overall)),
        )
        .orderBy(desc(restaurantRatings.overall), desc(restaurantRatings.updatedAt))
        .limit(FAVORITES);
      const recent = await tx
        .select({ rating: restaurantRatings, name: restaurants.name })
        .from(restaurantRatings)
        .innerJoin(restaurants, eq(restaurants.id, restaurantRatings.restaurantId))
        .where(and(...visible))
        .orderBy(desc(restaurantRatings.updatedAt), desc(restaurantRatings.id))
        .limit(RECENT);

      const result: PublicPlatesProfile = {
        profile: toPublicProfile(person, storage),
        stats: {
          restaurants: Number(visitStats?.restaurants ?? 0),
          visits: Number(visitStats?.visits ?? 0),
          averageRating: mean(ratings.map((row) => toNumber(row.overall))),
        },
        favorites: favorites.map((row) => ({
          id: row.id,
          name: row.name,
          coverThumbUrl: row.coverPath ? storage.publicUrl(thumbPathOf(row.coverPath)) : null,
          overall: Number(row.overall),
        })),
        recent: recent.map(({ rating, name }) => ({
          restaurantId: rating.restaurantId,
          restaurantName: name,
          overall: toNumber(rating.overall),
          review: rating.review,
          date: rating.updatedAt.toISOString(),
        })),
        isPartner,
      };
      return result;
    });
    return c.json(body);
  });

  app.get("/profiles/:username/plots", async (c) => {
    const user = c.get("user");
    const person = await findProfile(db, user.id, c.req.param("username"));
    const personPartner = await partnerOf(db, person.id);
    const isPartner = personPartner !== null && personPartner === user.id;
    const seesPrivate = isPartner || person.id === user.id;

    const body = await withUser(db, { sub: user.id }, async (tx) => {
      // Sessões contam pela RLS e pelo filtro: quem é de fora não conta as privadas.
      const counted: SQL[] = [eq(watchLogs.userId, person.id)];
      if (!seesPrivate) counted.push(eq(watchLogs.isPrivate, false));
      const [logStats] = await tx
        .select({ sessions: count(), titles: countDistinct(watchLogs.titleId) })
        .from(watchLogs)
        .where(and(...counted));
      const ratingVisible: SQL[] = [eq(titleRatings.userId, person.id), isNotNull(titleRatings.rating)];
      if (!seesPrivate) ratingVisible.push(eq(titleRatings.isPrivate, false));
      const ratings = await tx.select({ rating: titleRatings.rating }).from(titleRatings).where(and(...ratingVisible));
      const favorites = await tx
        .select({ id: titles.id, title: titles.title, posterPath: titles.posterPath, tmdbType: titles.tmdbType })
        .from(favoriteTitles)
        .innerJoin(titles, eq(titles.id, favoriteTitles.titleId))
        .where(eq(favoriteTitles.userId, person.id))
        .orderBy(asc(favoriteTitles.position));
      const logVisible: SQL[] = [eq(watchLogs.userId, person.id)];
      if (!seesPrivate) logVisible.push(eq(watchLogs.isPrivate, false));
      const recent = await tx
        .select({ log: watchLogs, title: titles.title, posterPath: titles.posterPath })
        .from(watchLogs)
        .innerJoin(titles, eq(titles.id, watchLogs.titleId))
        .where(and(...logVisible))
        .orderBy(desc(watchLogs.watchedOn), desc(watchLogs.createdAt), desc(watchLogs.id))
        .limit(RECENT);

      const result: PublicPlotsProfile = {
        profile: toPublicProfile(person, storage),
        stats: {
          sessions: Number(logStats?.sessions ?? 0),
          titles: Number(logStats?.titles ?? 0),
          averageRating: mean(ratings.map((row) => toNumber(row.rating))),
        },
        favorites: favorites.map((row) => ({ ...row, tmdbType: row.tmdbType as "movie" | "tv" })),
        recent: recent.map(({ log, title, posterPath }) => ({
          titleId: log.titleId,
          title,
          posterPath,
          seasonNumber: log.seasonNumber,
          rating: toNumber(log.rating),
          review: log.review,
          date: log.watchedOn,
        })),
        isPartner,
      };
      return result;
    });
    return c.json(body);
  });

  return app;
}
