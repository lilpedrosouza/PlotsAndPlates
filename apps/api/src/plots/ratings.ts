import { type Title, seasonRatings, seasons, titleRatings, watchLogs } from "@pap/db";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { badRequest } from "../errors";
import type { PlotsContext } from "./queries";

/**
 * Confere a temporada de um registro: filme não tem temporada; série precisa
 * de uma que exista no catálogo.
 */
export async function assertSeasonFor(ctx: PlotsContext, title: Title, seasonNumber: number | null | undefined) {
  if (title.tmdbType === "movie") {
    if (seasonNumber != null) throw badRequest("Filme não tem temporada.", { seasonNumber: "Filme não tem temporada." });
    return;
  }
  if (seasonNumber == null) throw badRequest("Escolha a temporada.", { seasonNumber: "Escolha a temporada." });
  const [season] = await ctx.tx
    .select({ number: seasons.number })
    .from(seasons)
    .where(and(eq(seasons.titleId, title.id), eq(seasons.number, seasonNumber)));
  if (!season) throw badRequest("Essa temporada não existe.", { seasonNumber: "Essa temporada não existe." });
}

/**
 * A nota atual do filme (ou da temporada) é a do registro mais recente com
 * nota. Chamada depois de criar, editar ou apagar um registro. A nota da série
 * inteira não muda aqui: é dada à parte.
 */
export async function syncCurrentRating(ctx: PlotsContext, title: Title, seasonNumber: number | null) {
  const { tx, userId } = ctx;
  const sameTarget = seasonNumber === null ? isNull(watchLogs.seasonNumber) : eq(watchLogs.seasonNumber, seasonNumber);
  const [latest] = await tx
    .select()
    .from(watchLogs)
    .where(and(eq(watchLogs.userId, userId), eq(watchLogs.titleId, title.id), sameTarget, isNotNull(watchLogs.rating)))
    .orderBy(desc(watchLogs.watchedOn), desc(watchLogs.createdAt))
    .limit(1);

  if (title.tmdbType === "movie") {
    const [lastLog] = await tx
      .select({ liked: watchLogs.liked })
      .from(watchLogs)
      .where(and(eq(watchLogs.userId, userId), eq(watchLogs.titleId, title.id)))
      .orderBy(desc(watchLogs.watchedOn), desc(watchLogs.createdAt))
      .limit(1);
    if (!latest && !lastLog) {
      await tx.delete(titleRatings).where(and(eq(titleRatings.userId, userId), eq(titleRatings.titleId, title.id)));
      return;
    }
    const values = {
      rating: latest?.rating ?? null,
      liked: lastLog?.liked ?? false,
      isPrivate: latest?.isPrivate ?? false,
      updatedAt: new Date(),
    };
    await tx
      .insert(titleRatings)
      .values({ userId, titleId: title.id, ...values })
      .onConflictDoUpdate({ target: [titleRatings.userId, titleRatings.titleId], set: values });
    return;
  }

  if (seasonNumber === null) return;
  if (!latest?.rating) {
    await tx
      .delete(seasonRatings)
      .where(and(eq(seasonRatings.userId, userId), eq(seasonRatings.titleId, title.id), eq(seasonRatings.seasonNumber, seasonNumber)));
    return;
  }
  const values = { rating: latest.rating, isPrivate: latest.isPrivate, updatedAt: new Date() };
  await tx
    .insert(seasonRatings)
    .values({ userId, titleId: title.id, seasonNumber, ...values })
    .onConflictDoUpdate({ target: [seasonRatings.userId, seasonRatings.titleId, seasonRatings.seasonNumber], set: values });
}
