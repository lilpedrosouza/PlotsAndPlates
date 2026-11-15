import {
  type Db,
  restaurantRatings,
  restaurants,
  seasons,
  titleRatings,
  titles,
  userAchievements,
  visitDishes,
  visits,
  watchLogs,
} from "@pap/db";
import {
  type AchievementKey,
  type Wrapped,
  type WrappedComparison,
  closestAndFarthest,
  isAchievementKey,
  sessionMinutes,
  sideBySide,
  thumbPathOf,
  topBy,
} from "@pap/shared";
import { and, asc, countDistinct, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { partnerOf, peopleById } from "../couples/partner";
import type { MediaStorage } from "../storage";

const yearRange = (year: number) => ({ from: `${year}-01-01`, to: `${year}-12-31` });
const toNumber = (value: string | null) => (value === null ? null : Number(value));

/** Notas da pessoa e do par por item. */
function ratingPairs<K>(rows: { id: K; userId: string; value: string | null }[], viewerId: string) {
  const pairs = new Map<K, { mine: number | null; partner: number | null }>();
  for (const row of rows) {
    const value = toNumber(row.value);
    if (value === null) continue;
    const pair = pairs.get(row.id) ?? { mine: null, partner: null };
    if (row.userId === viewerId) pair.mine = value;
    else pair.partner = value;
    pairs.set(row.id, pair);
  }
  return pairs;
}

/** O item de maior média do casal (ou da pessoa, sem par). */
function champion<K>(pairs: Map<K, { mine: number | null; partner: number | null }>) {
  let best: { id: K; score: number } | null = null;
  for (const [id, pair] of pairs) {
    const score = sideBySide(pair.mine, pair.partner).couple;
    if (score !== null && (!best || score > best.score)) best = { id, score };
  }
  return best;
}

/**
 * Wrapped do casal de agora (quem pede e o par) num ano. Tudo calculado na
 * hora com a conexão dona das tabelas: o Wrapped é só dos dois, privados entram.
 */
export async function loadWrapped(db: Db, viewerId: string, year: number, storage: MediaStorage): Promise<Wrapped> {
  const partner = await partnerOf(db, viewerId);
  const ids = partner ? [viewerId, partner] : [viewerId];
  const { from, to } = yearRange(year);
  const people = await peopleById(db, ids, storage);

  // Plates: visitas dos dois no ano (a "juntos" é uma linha só).
  const coverPath = sql<string | null>`coalesce(${restaurants.coverPath}, (
    select p.path from public.restaurant_photos p where p.restaurant_id = ${restaurants.id} order by p.position, p.created_at limit 1))`;
  const visitRows = await db
    .select({ id: visits.id, restaurantId: visits.restaurantId, name: restaurants.name, cuisines: restaurants.cuisines, coverPath })
    .from(visits)
    .innerJoin(restaurants, eq(restaurants.id, visits.restaurantId))
    .where(and(inArray(visits.userId, ids), gte(visits.visitedOn, from), lte(visits.visitedOn, to)));
  const placeIds = [...new Set(visitRows.map((row) => row.restaurantId))];
  const place = new Map(visitRows.map((row) => [row.restaurantId, row]));
  const thumb = (path: string | null) => (path ? storage.publicUrl(thumbPathOf(path)) : null);

  const [dishCount] = visitRows.length
    ? await db
        .select({ n: countDistinct(visitDishes.dishId) })
        .from(visitDishes)
        .where(inArray(visitDishes.visitId, visitRows.map((row) => row.id)))
    : [{ n: 0 }];
  const placeRatings = placeIds.length
    ? ratingPairs(
        await db
          .select({ id: restaurantRatings.restaurantId, userId: restaurantRatings.userId, value: restaurantRatings.overall })
          .from(restaurantRatings)
          .where(and(inArray(restaurantRatings.restaurantId, placeIds), inArray(restaurantRatings.userId, ids))),
        viewerId,
      )
    : new Map<string, { mine: number | null; partner: number | null }>();
  const coupleScore = (restaurantId: string) => {
    const pair = placeRatings.get(restaurantId);
    return pair ? (sideBySide(pair.mine, pair.partner).couple ?? 0) : 0;
  };
  const cuisineScore = (cuisine: string) => {
    const scores = placeIds.filter((id) => place.get(id)?.cuisines.includes(cuisine)).map(coupleScore);
    return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  };
  const favoriteCuisine = topBy(visitRows.flatMap((row) => row.cuisines), (cuisine) => cuisine, cuisineScore);
  const mostVisited = topBy(visitRows, (row) => row.restaurantId, coupleScore);
  const bestPlace = champion(placeRatings);

  // Plots: sessões dos dois no ano; a "juntos" espelhada conta uma vez.
  const logRows = await db
    .select({
      id: watchLogs.id,
      groupId: watchLogs.groupId,
      titleId: watchLogs.titleId,
      tmdbType: titles.tmdbType,
      title: titles.title,
      posterPath: titles.posterPath,
      runtime: titles.runtime,
      genres: titles.genres,
      episodeCount: seasons.episodeCount,
    })
    .from(watchLogs)
    .innerJoin(titles, eq(titles.id, watchLogs.titleId))
    .leftJoin(seasons, and(eq(seasons.titleId, watchLogs.titleId), eq(seasons.number, watchLogs.seasonNumber)))
    .where(and(inArray(watchLogs.userId, ids), gte(watchLogs.watchedOn, from), lte(watchLogs.watchedOn, to)));
  const sessionsByKey = new Map<string, (typeof logRows)[number]>();
  for (const row of logRows) if (!sessionsByKey.has(row.groupId ?? row.id)) sessionsByKey.set(row.groupId ?? row.id, row);
  const sessions = [...sessionsByKey.values()];
  const titleIds = [...new Set(sessions.map((row) => row.titleId))];
  const titleOf = new Map(sessions.map((row) => [row.titleId, row]));
  const titlePairs = titleIds.length
    ? ratingPairs(
        await db
          .select({ id: titleRatings.titleId, userId: titleRatings.userId, value: titleRatings.rating })
          .from(titleRatings)
          .where(and(inArray(titleRatings.titleId, titleIds), inArray(titleRatings.userId, ids))),
        viewerId,
      )
    : new Map<string, { mine: number | null; partner: number | null }>();
  const favoriteGenre = topBy(sessions.flatMap((row) => row.genres), (genre) => genre);
  const mostWatched = topBy(sessions, (row) => row.titleId);
  const bestTitle = champion(titlePairs);

  // O casal: notas dos dois nos restaurantes e títulos do ano.
  let couple: Wrapped["couple"] = null;
  if (partner) {
    const comparisons: WrappedComparison[] = [];
    for (const [id, pair] of placeRatings) {
      if (pair.mine === null || pair.partner === null) continue;
      const row = place.get(id);
      comparisons.push({ kind: "restaurant", id, name: row?.name ?? "", imageUrl: thumb(row?.coverPath ?? null), mine: pair.mine, partner: pair.partner });
    }
    for (const [id, pair] of titlePairs) {
      if (pair.mine === null || pair.partner === null) continue;
      const row = titleOf.get(id);
      comparisons.push({ kind: "title", id, name: row?.title ?? "", imageUrl: row?.posterPath ?? null, mine: pair.mine, partner: pair.partner });
    }
    couple = closestAndFarthest(comparisons);
  }

  const unlocked = await db
    .select({ key: userAchievements.key, unlockedAt: userAchievements.unlockedAt })
    .from(userAchievements)
    .where(
      and(
        eq(userAchievements.userId, viewerId),
        gte(userAchievements.unlockedAt, new Date(`${from}T00:00:00Z`)),
        lte(userAchievements.unlockedAt, new Date(`${to}T23:59:59.999Z`)),
      ),
    )
    .orderBy(asc(userAchievements.unlockedAt));

  const placeChampion = bestPlace ? place.get(bestPlace.id) : undefined;
  const titleChampion = bestTitle ? titleOf.get(bestTitle.id) : undefined;
  const mostVisitedRow = mostVisited ? place.get(mostVisited.key) : undefined;
  const mostWatchedRow = mostWatched ? titleOf.get(mostWatched.key) : undefined;

  return {
    year,
    partial: year === new Date().getFullYear(),
    people: ids.map((id) => people.get(id)).filter((person) => person !== undefined),
    plates: {
      restaurants: placeIds.length,
      visits: visitRows.length,
      dishes: Number(dishCount?.n ?? 0),
      favoriteCuisine: favoriteCuisine ? { name: favoriteCuisine.key, count: favoriteCuisine.count } : null,
      mostVisited:
        mostVisited && mostVisitedRow
          ? { id: mostVisited.key, name: mostVisitedRow.name, coverThumbUrl: thumb(mostVisitedRow.coverPath), visits: mostVisited.count }
          : null,
      champion:
        bestPlace && placeChampion
          ? {
              id: bestPlace.id,
              name: placeChampion.name,
              coverThumbUrl: thumb(placeChampion.coverPath),
              ratings: sideBySide(placeRatings.get(bestPlace.id)?.mine, placeRatings.get(bestPlace.id)?.partner),
            }
          : null,
    },
    plots: {
      sessions: sessions.length,
      together: sessions.filter((row) => row.groupId !== null).length,
      minutes: sessions.reduce((total, row) => total + sessionMinutes({ tmdbType: row.tmdbType as "movie" | "tv", runtime: row.runtime, episodeCount: row.episodeCount }), 0),
      titles: titleIds.length,
      favoriteGenre: favoriteGenre ? { name: favoriteGenre.key, count: favoriteGenre.count } : null,
      mostWatched:
        mostWatched && mostWatchedRow
          ? {
              id: mostWatched.key,
              title: mostWatchedRow.title,
              posterPath: mostWatchedRow.posterPath,
              tmdbType: mostWatchedRow.tmdbType as "movie" | "tv",
              sessions: mostWatched.count,
            }
          : null,
      champion:
        bestTitle && titleChampion
          ? {
              id: bestTitle.id,
              title: titleChampion.title,
              posterPath: titleChampion.posterPath,
              tmdbType: titleChampion.tmdbType as "movie" | "tv",
              ratings: sideBySide(titlePairs.get(bestTitle.id)?.mine, titlePairs.get(bestTitle.id)?.partner),
            }
          : null,
    },
    couple,
    achievements: unlocked
      .filter((row) => isAchievementKey(row.key))
      .map((row) => ({ key: row.key as AchievementKey, unlockedAt: row.unlockedAt.toISOString() })),
  };
}

/** Anos em que algum dos dois registrou visita ou sessão, do mais recente ao mais antigo. */
export async function wrappedYears(db: Db, viewerId: string): Promise<number[]> {
  const partner = await partnerOf(db, viewerId);
  const ids = partner ? [viewerId, partner] : [viewerId];
  const fromVisits = await db
    .selectDistinct({ year: sql<number>`extract(year from ${visits.visitedOn})::int` })
    .from(visits)
    .where(inArray(visits.userId, ids));
  const fromLogs = await db
    .selectDistinct({ year: sql<number>`extract(year from ${watchLogs.watchedOn})::int` })
    .from(watchLogs)
    .where(inArray(watchLogs.userId, ids));
  return [...new Set([...fromVisits, ...fromLogs].map((row) => Number(row.year)))].sort((a, b) => b - a);
}
