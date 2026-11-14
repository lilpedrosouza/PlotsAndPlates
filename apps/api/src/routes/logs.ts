import { randomUUID } from "node:crypto";
import { type Db, type Title, seasonRatings, titleRatings, titles, watchLogs, withUser } from "@pap/db";
import {
  type DiaryEntry,
  type LogInput,
  type Page,
  type TitleKind,
  type TmdbType,
  type WatchLog,
  diaryQuerySchema,
  isRewatch,
  logInputSchema,
  logPatchSchema,
  seasonRatingInputSchema,
  titleRatingInputSchema,
} from "@pap/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { partnerOf } from "../couples/partner";
import { badRequest, notFound } from "../errors";
import { decodeCursor, encodeCursor } from "../plates/cursor";
import { type PlotsContext, findTitle, toLog } from "../plots/queries";
import { assertSeasonFor, markLiked, syncCurrentRating } from "../plots/ratings";
import type { AppDeps, AppEnv } from "../types";
import { validate } from "../validate";
import { routeId } from "./restaurants";

const numeric = (value: number | null | undefined) => (value == null ? null : String(value));

/** Registro do par a criar depois da transação (sessão "juntos"). */
export type PartnerMirror = { partnerId: string; titleId: string; seasonNumber: number | null; watchedOn: string; groupId: string };

/**
 * Cria um registro no diário (usado também pelo "Assistimos!"). Em "juntos"
 * com par, devolve o espelho a gravar para o par (fora da transação: o RLS não
 * deixa ninguém gravar registro em nome de outra pessoa).
 */
export async function insertLog(
  ctx: PlotsContext,
  title: Title,
  input: Required<Pick<LogInput, "watchedOn">> & LogInput,
): Promise<{ log: WatchLog; mirror: PartnerMirror | null }> {
  const seasonNumber = input.seasonNumber ?? null;
  await assertSeasonFor(ctx, title, seasonNumber);
  const partnerId = await partnerOf(ctx.tx, ctx.userId);
  const together = input.together ?? Boolean(partnerId);
  const groupId = together && partnerId ? randomUUID() : null;
  const previous = await ctx.tx
    .select({ seasonNumber: watchLogs.seasonNumber })
    .from(watchLogs)
    .where(and(eq(watchLogs.userId, ctx.userId), eq(watchLogs.titleId, title.id)));
  const [row] = await ctx.tx
    .insert(watchLogs)
    .values({
      userId: ctx.userId,
      titleId: title.id,
      seasonNumber,
      watchedOn: input.watchedOn,
      rating: numeric(input.rating),
      review: input.review ?? "",
      liked: input.liked ?? false,
      rewatch: input.rewatch ?? isRewatch(previous, seasonNumber),
      isPrivate: input.isPrivate ?? false,
      together,
      groupId,
    })
    .returning();
  if (!row) throw new Error("O registro não foi criado.");
  if (row.rating !== null) await syncCurrentRating(ctx, title, seasonNumber);
  if (row.liked) await markLiked(ctx, title);
  return {
    log: toLog(row),
    mirror: groupId && partnerId ? { partnerId, titleId: title.id, seasonNumber, watchedOn: input.watchedOn, groupId } : null,
  };
}

/** Grava o registro do par (sem nota) com a conexão dona das tabelas. */
export async function writeMirror(db: Db, mirror: PartnerMirror | null) {
  if (!mirror) return;
  const previous = await db
    .select({ seasonNumber: watchLogs.seasonNumber })
    .from(watchLogs)
    .where(and(eq(watchLogs.userId, mirror.partnerId), eq(watchLogs.titleId, mirror.titleId)));
  await db.insert(watchLogs).values({
    userId: mirror.partnerId,
    titleId: mirror.titleId,
    seasonNumber: mirror.seasonNumber,
    watchedOn: mirror.watchedOn,
    together: true,
    groupId: mirror.groupId,
    rewatch: isRewatch(previous, mirror.seasonNumber),
  });
}

/** Diário, registros e notas de Plots. */
export function logRoutes(deps: Pick<AppDeps, "db">) {
  const { db } = deps;
  const app = new Hono<AppEnv>();
  const inTitle = async <T>(user: { id: string }, titleId: string, fn: (ctx: PlotsContext, title: Title) => Promise<T>) =>
    withUser(db, { sub: user.id }, async (tx) => {
      const ctx = { tx, userId: user.id };
      const title = await findTitle(tx, titleId);
      if (!title) throw notFound("Título não encontrado.");
      return fn(ctx, title);
    });

  app.post("/titles/:id/logs", validate("json", logInputSchema), async (c) => {
    const user = c.get("user");
    const input = c.req.valid("json");
    const { log, mirror } = await inTitle(user, routeId(c.req.param("id")), (ctx, title) => insertLog(ctx, title, input));
    await writeMirror(db, mirror);
    return c.json(log, 201);
  });

  app.patch("/logs/:id", validate("json", logPatchSchema), async (c) => {
    const user = c.get("user");
    const logId = routeId(c.req.param("id"));
    const patch = c.req.valid("json");
    const log = await withUser(db, { sub: user.id }, async (tx) => {
      const ctx = { tx, userId: user.id };
      const [current] = await tx.select().from(watchLogs).where(and(eq(watchLogs.id, logId), eq(watchLogs.userId, user.id)));
      if (!current) throw notFound("Registro não encontrado.");
      const title = await findTitle(tx, current.titleId);
      if (!title) throw notFound("Título não encontrado.");
      const seasonNumber = patch.seasonNumber !== undefined ? patch.seasonNumber : current.seasonNumber;
      if (patch.seasonNumber !== undefined) await assertSeasonFor(ctx, title, seasonNumber);
      // "Juntos" só vale na criação, quando nasce o registro do par; editar não mexe nele.
      const { rating, together: _together, ...rest } = patch;
      const [row] = await tx
        .update(watchLogs)
        .set({ ...rest, ...(rating !== undefined ? { rating: numeric(rating) } : {}), seasonNumber: seasonNumber ?? null, updatedAt: new Date() })
        .where(eq(watchLogs.id, logId))
        .returning();
      if (!row) throw notFound("Registro não encontrado.");
      // Só recalcula a nota atual se mudou algo que mexe nela.
      const touchesRating = rating !== undefined || patch.watchedOn !== undefined || patch.seasonNumber !== undefined;
      if (touchesRating) {
        await syncCurrentRating(ctx, title, row.seasonNumber);
        if (current.seasonNumber !== row.seasonNumber) await syncCurrentRating(ctx, title, current.seasonNumber);
      }
      if (patch.liked === true) await markLiked(ctx, title);
      return toLog(row);
    });
    return c.json(log);
  });

  app.delete("/logs/:id", async (c) => {
    const user = c.get("user");
    const logId = routeId(c.req.param("id"));
    await withUser(db, { sub: user.id }, async (tx) => {
      const [removed] = await tx
        .delete(watchLogs)
        .where(and(eq(watchLogs.id, logId), eq(watchLogs.userId, user.id)))
        .returning();
      if (!removed) throw notFound("Registro não encontrado.");
      const title = await findTitle(tx, removed.titleId);
      if (title && removed.rating !== null) await syncCurrentRating({ tx, userId: user.id }, title, removed.seasonNumber);
    });
    return c.body(null, 204);
  });

  /** Diário: do mais recente para o mais antigo; o número da sessão segue a ordem em que foi visto. */
  app.get("/diary", validate("query", diaryQuerySchema), async (c) => {
    const user = c.get("user");
    const { year, cursor, limit } = c.req.valid("query");
    const offset = decodeCursor(cursor);
    const page = await withUser(db, { sub: user.id }, async (tx) => {
      const numbered = tx
        .select({
          id: watchLogs.id,
          titleId: watchLogs.titleId,
          seasonNumber: watchLogs.seasonNumber,
          watchedOn: watchLogs.watchedOn,
          rating: watchLogs.rating,
          review: watchLogs.review,
          liked: watchLogs.liked,
          rewatch: watchLogs.rewatch,
          isPrivate: watchLogs.isPrivate,
          together: watchLogs.together,
          createdAt: watchLogs.createdAt,
          serial: sql<number>`(row_number() over (order by ${watchLogs.watchedOn} asc, ${watchLogs.createdAt} asc))::int`.as("serial"),
        })
        .from(watchLogs)
        .where(eq(watchLogs.userId, user.id))
        .as("numbered");
      const rows = await tx
        .select({
          log: {
            id: numbered.id,
            titleId: numbered.titleId,
            seasonNumber: numbered.seasonNumber,
            watchedOn: numbered.watchedOn,
            rating: numbered.rating,
            review: numbered.review,
            liked: numbered.liked,
            rewatch: numbered.rewatch,
            isPrivate: numbered.isPrivate,
            together: numbered.together,
            serial: numbered.serial,
          },
          title: titles,
        })
        .from(numbered)
        .innerJoin(titles, eq(titles.id, numbered.titleId))
        .where(year ? sql`extract(year from ${numbered.watchedOn}) = ${year}` : undefined)
        .orderBy(desc(numbered.watchedOn), desc(numbered.createdAt))
        .limit(limit + 1)
        .offset(offset);
      const items: DiaryEntry[] = rows.slice(0, limit).map(({ log, title }) => ({
        id: log.id,
        titleId: log.titleId,
        seasonNumber: log.seasonNumber,
        watchedOn: log.watchedOn,
        rating: log.rating === null ? null : Number(log.rating),
        review: log.review,
        liked: log.liked,
        rewatch: log.rewatch,
        isPrivate: log.isPrivate,
        together: log.together,
        serial: log.serial,
        title: {
          id: title.id,
          tmdbType: title.tmdbType as TmdbType,
          kind: title.kind as TitleKind,
          title: title.title,
          year: title.year,
          posterPath: title.posterPath,
          runtime: title.runtime,
          seasonCount: title.seasonCount,
        },
      }));
      const body: Page<DiaryEntry> = { items, nextCursor: rows.length > limit ? encodeCursor(offset + limit) : null };
      return body;
    });
    return c.json(page);
  });

  /** Nota do filme ou da série inteira, dada direto (sem criar registro). */
  app.put("/titles/:id/rating", validate("json", titleRatingInputSchema), async (c) => {
    const user = c.get("user");
    const input = c.req.valid("json");
    const rating = await inTitle(user, routeId(c.req.param("id")), async (ctx, title) => {
      const values = {
        ...(input.rating !== undefined ? { rating: numeric(input.rating) } : {}),
        ...(input.liked !== undefined ? { liked: input.liked } : {}),
        isPrivate: input.isPrivate ?? false,
        updatedAt: new Date(),
      };
      const [row] = await ctx.tx
        .insert(titleRatings)
        .values({ userId: user.id, titleId: title.id, ...values })
        .onConflictDoUpdate({ target: [titleRatings.userId, titleRatings.titleId], set: values })
        .returning();
      return { rating: row?.rating == null ? null : Number(row.rating), liked: row?.liked ?? false, isPrivate: row?.isPrivate ?? false };
    });
    return c.json(rating);
  });

  app.delete("/titles/:id/rating", async (c) => {
    const user = c.get("user");
    await inTitle(user, routeId(c.req.param("id")), (ctx, title) =>
      ctx.tx.delete(titleRatings).where(and(eq(titleRatings.userId, user.id), eq(titleRatings.titleId, title.id))),
    );
    return c.body(null, 204);
  });

  const seasonParam = (value: string | undefined) => {
    const number = Number(value);
    if (!Number.isInteger(number) || number < 0) throw badRequest("Temporada inválida.");
    return number;
  };

  app.put("/titles/:id/seasons/:n/rating", validate("json", seasonRatingInputSchema), async (c) => {
    const user = c.get("user");
    const seasonNumber = seasonParam(c.req.param("n"));
    const { rating } = c.req.valid("json");
    await inTitle(user, routeId(c.req.param("id")), async (ctx, title) => {
      await assertSeasonFor(ctx, title, seasonNumber);
      const values = { rating: String(rating), updatedAt: new Date() };
      await ctx.tx
        .insert(seasonRatings)
        .values({ userId: user.id, titleId: title.id, seasonNumber, ...values })
        .onConflictDoUpdate({ target: [seasonRatings.userId, seasonRatings.titleId, seasonRatings.seasonNumber], set: values });
    });
    return c.json({ seasonNumber, rating });
  });

  app.delete("/titles/:id/seasons/:n/rating", async (c) => {
    const user = c.get("user");
    const seasonNumber = seasonParam(c.req.param("n"));
    await inTitle(user, routeId(c.req.param("id")), (ctx, title) =>
      ctx.tx
        .delete(seasonRatings)
        .where(and(eq(seasonRatings.userId, user.id), eq(seasonRatings.titleId, title.id), eq(seasonRatings.seasonNumber, seasonNumber))),
    );
    return c.body(null, 204);
  });

  return app;
}
