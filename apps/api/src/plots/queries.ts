import {
  type Title,
  type Tx,
  type WatchLogRow,
  customLists,
  favoriteTitles,
  listItems,
  plotsWatchlist,
  seasonRatings,
  seasons,
  titleRatings,
  titles,
  watchLogs,
} from "@pap/db";
import {
  type TitleDetail,
  type TitleKind,
  type TitleSummary,
  type TmdbType,
  type WatchLog,
  suggestSeriesRating,
} from "@pap/shared";
import { and, asc, desc, eq } from "drizzle-orm";

/** Quem está vendo e a transação com a identidade dela (RLS valendo). */
export type PlotsContext = { tx: Tx; userId: string };

const toNumber = (value: string | null | undefined) => (value === null || value === undefined ? null : Number(value));

export function summaryOf(row: Title): TitleSummary {
  return {
    id: row.id,
    tmdbType: row.tmdbType as TmdbType,
    kind: row.kind as TitleKind,
    title: row.title,
    year: row.year,
    posterPath: row.posterPath,
    runtime: row.runtime,
    seasonCount: row.seasonCount,
  };
}

export function toLog(row: WatchLogRow): WatchLog {
  return {
    id: row.id,
    titleId: row.titleId,
    seasonNumber: row.seasonNumber,
    watchedOn: row.watchedOn,
    rating: toNumber(row.rating),
    review: row.review,
    liked: row.liked,
    rewatch: row.rewatch,
    isPrivate: row.isPrivate,
  };
}

export async function findTitle(tx: Tx, titleId: string): Promise<Title | null> {
  const [row] = await tx.select().from(titles).where(eq(titles.id, titleId));
  return row ?? null;
}

/** Página do título com tudo o que é de quem está vendo. `null` se não existir. */
export async function loadTitleDetail(ctx: PlotsContext, titleId: string): Promise<TitleDetail | null> {
  const { tx, userId } = ctx;
  const row = await findTitle(tx, titleId);
  if (!row) return null;

  const [seasonRows, mySeasonRatings, [rating], logs, [watch], [favorite], lists] = await Promise.all([
    tx.select().from(seasons).where(eq(seasons.titleId, titleId)).orderBy(asc(seasons.number)),
    tx
      .select()
      .from(seasonRatings)
      .where(and(eq(seasonRatings.titleId, titleId), eq(seasonRatings.userId, userId))),
    tx
      .select()
      .from(titleRatings)
      .where(and(eq(titleRatings.titleId, titleId), eq(titleRatings.userId, userId))),
    tx
      .select()
      .from(watchLogs)
      .where(and(eq(watchLogs.titleId, titleId), eq(watchLogs.userId, userId)))
      .orderBy(desc(watchLogs.watchedOn), desc(watchLogs.createdAt)),
    tx
      .select({ id: plotsWatchlist.id })
      .from(plotsWatchlist)
      .where(and(eq(plotsWatchlist.titleId, titleId), eq(plotsWatchlist.userId, userId))),
    tx
      .select({ position: favoriteTitles.position })
      .from(favoriteTitles)
      .where(and(eq(favoriteTitles.titleId, titleId), eq(favoriteTitles.userId, userId))),
    tx
      .select({ id: customLists.id, name: customLists.name, itemId: listItems.id })
      .from(customLists)
      .leftJoin(listItems, and(eq(listItems.listId, customLists.id), eq(listItems.titleId, titleId)))
      .where(eq(customLists.ownerId, userId))
      .orderBy(asc(customLists.name)),
  ]);

  const seasonRating = new Map(mySeasonRatings.map((item) => [item.seasonNumber, Number(item.rating)]));
  const credits = row.credits ?? { directors: [], cast: [] };

  return {
    ...summaryOf(row),
    originalTitle: row.originalTitle,
    overview: row.overview,
    backdropPath: row.backdropPath,
    genres: row.genres,
    directors: credits.directors,
    cast: credits.cast,
    providers: row.providers ?? null,
    seasons: seasonRows.map((season) => ({
      number: season.number,
      name: season.name,
      episodeCount: season.episodeCount,
      year: season.year,
      posterPath: season.posterPath,
      myRating: seasonRating.get(season.number) ?? null,
    })),
    myRating: rating ? { rating: toNumber(rating.rating), liked: rating.liked, isPrivate: rating.isPrivate } : null,
    seasonSuggestion: suggestSeriesRating([...seasonRating.values()]),
    logs: logs.map(toLog),
    inWatchlist: Boolean(watch),
    favorite: Boolean(favorite),
    lists: lists.map((list) => ({ id: list.id, name: list.name, hasTitle: list.itemId !== null })),
    fetchedAt: row.fetchedAt.toISOString(),
  };
}
