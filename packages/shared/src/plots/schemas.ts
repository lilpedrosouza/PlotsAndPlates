import { z } from "zod";
import { patchOf, ratingSchema, visitDateSchema } from "../plates/schemas";
import { TITLE_KINDS } from "./kind";

const text = (max: number) => z.string().trim().max(max).default("");

export const tmdbSearchQuerySchema = z.object({
  q: z.string().trim().min(1, "Digite o nome do filme ou da série.").max(100),
  page: z.coerce.number().int().min(1).max(20).default(1),
});
export type TmdbSearchQuery = z.input<typeof tmdbSearchQuerySchema>;

/** Um registro no diário: o filme numa sessão, ou uma temporada de série. */
export const logInputSchema = z.object({
  watchedOn: visitDateSchema,
  rating: ratingSchema.nullable().optional(),
  review: text(4000),
  liked: z.boolean().default(false),
  /** Ausente: a API decide pelo histórico (já havia registro do mesmo filme/temporada). */
  rewatch: z.boolean().optional(),
  isPrivate: z.boolean().default(false),
  seasonNumber: z.number().int().min(0).max(200).nullable().optional(),
  /** "Vimos juntos": cria também o registro do par. Ausente: juntos se houver par. */
  together: z.boolean().optional(),
});
export type LogInput = z.input<typeof logInputSchema>;
export const logPatchSchema = patchOf(logInputSchema);
export type LogPatch = z.input<typeof logPatchSchema>;

export const titleRatingInputSchema = z.object({
  rating: ratingSchema.nullable().optional(),
  liked: z.boolean().optional(),
  isPrivate: z.boolean().default(false),
});
export type TitleRatingInput = z.input<typeof titleRatingInputSchema>;

export const seasonRatingInputSchema = z.object({ rating: ratingSchema });
export type SeasonRatingInput = z.input<typeof seasonRatingInputSchema>;

export const plotsWatchlistInputSchema = z.object({ note: text(200) });
export type PlotsWatchlistInput = z.input<typeof plotsWatchlistInputSchema>;

const booleanParam = z
  .enum(["true", "false"])
  .optional()
  .transform((value) => value === "true");

export const watchlistQuerySchema = z.object({
  onlyMine: booleanParam,
  kind: z.enum(TITLE_KINDS).optional(),
  sort: z.enum(["recentes", "titulo"]).default("recentes"),
});
export type WatchlistQuery = z.input<typeof watchlistQuerySchema>;

export const favoritesInputSchema = z.object({
  titleIds: z
    .array(z.uuid())
    .max(4, "O Top 4 tem no máximo 4 títulos.")
    .refine((ids) => new Set(ids).size === ids.length, "Um título só pode aparecer uma vez no Top 4."),
});
export type FavoritesInput = z.input<typeof favoritesInputSchema>;

export const listInputSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome à lista.").max(60),
  description: text(300),
  isPrivate: z.boolean().default(false),
});
export type ListInput = z.input<typeof listInputSchema>;
export const listPatchSchema = patchOf(listInputSchema).refine((value) => Object.keys(value).length > 0, "Nada para atualizar.");
export type ListPatch = z.input<typeof listPatchSchema>;

export const listItemInputSchema = z.object({ titleId: z.uuid(), note: text(140) });
export type ListItemInput = z.input<typeof listItemInputSchema>;

export const listReorderSchema = z.object({ itemIds: z.array(z.uuid()).max(500) });

export const kindInputSchema = z.object({ kind: z.enum(TITLE_KINDS) });

export const diaryQuerySchema = z.object({
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(60).default(30),
});
export type DiaryQuery = z.input<typeof diaryQuerySchema>;
