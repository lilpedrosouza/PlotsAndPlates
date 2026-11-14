import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgPolicy,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authUid, authUsers, authenticatedRole } from "drizzle-orm/supabase";

/**
 * Plots: o catálogo em cache do TMDB (compartilhado, gravado só pela API, que
 * é dona das tabelas e por isso passa pelo RLS), o diário, as notas, o "quero
 * ver", as listas e o Top 4 de cada pessoa.
 */

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
const userRef = (name: string) =>
  uuid(name)
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" });
/**
 * Dados das pessoas (diário, notas, listas, Top 4) impedem que o título seja
 * apagado (restrict): a limpeza do catálogo nunca leva junto um registro, nem
 * numa corrida com um registro sendo gravado. Temporadas vão junto (cascade).
 */
const titleRef = (onDelete: "cascade" | "restrict" = "restrict") =>
  uuid("title_id")
    .notNull()
    .references(() => titles.id, { onDelete });
const rating = (name: string) => numeric(name, { precision: 2, scale: 1 });
const ratingCheck = (column: AnyPgColumn) => sql`${column} between 0.5 and 5 and ${column} * 2 = floor(${column} * 2)`;
const isMine = (column: AnyPgColumn) => sql`${column} = ${authUid}`;
/** Linha do par de quem está logado (`public.partner_of`, migration custom). */
const isPartners = (column: AnyPgColumn) => sql`${column} = public.partner_of(${authUid})`;

/** Políticas de conteúdo pessoal com opção de privado: o dono faz tudo; os outros leem o que é público. */
const ownedPolicies = (prefix: string, userId: AnyPgColumn, isPrivate: AnyPgColumn) => [
  pgPolicy(`${prefix}_select_visible`, {
    for: "select",
    to: authenticatedRole,
    using: sql`${isMine(userId)} or not ${isPrivate} or ${isPartners(userId)}`,
  }),
  pgPolicy(`${prefix}_insert_own`, { for: "insert", to: authenticatedRole, withCheck: isMine(userId) }),
  pgPolicy(`${prefix}_update_own`, { for: "update", to: authenticatedRole, using: isMine(userId), withCheck: isMine(userId) }),
  pgPolicy(`${prefix}_delete_own`, { for: "delete", to: authenticatedRole, using: isMine(userId) }),
];

export type TitleCredits = { directors: string[]; cast: { name: string; character: string }[] };
export type TitleProviders = {
  link: string | null;
  flatrate: { id: number; name: string; logoPath: string | null }[];
  rent: { id: number; name: string; logoPath: string | null }[];
  buy: { id: number; name: string; logoPath: string | null }[];
};

export const titles = pgTable(
  "titles",
  {
    id: id(),
    tmdbType: text("tmdb_type").notNull(),
    tmdbId: integer("tmdb_id").notNull(),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    originalTitle: text("original_title").notNull().default(""),
    year: smallint("year"),
    runtime: smallint("runtime"),
    overview: text("overview").notNull().default(""),
    posterPath: text("poster_path"),
    backdropPath: text("backdrop_path"),
    genres: text("genres")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    credits: jsonb("credits").$type<TitleCredits>().notNull().default({ directors: [], cast: [] }),
    seasonCount: smallint("season_count"),
    providers: jsonb("providers").$type<TitleProviders | null>(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("titles_tmdb_key").on(table.tmdbType, table.tmdbId),
    index("titles_fetched_at_idx").on(table.fetchedAt),
    check("titles_tmdb_type", sql`${table.tmdbType} in ('movie', 'tv')`),
    check("titles_kind", sql`${table.kind} in ('filme', 'serie', 'documentario', 'anime', 'especial')`),
    pgPolicy("titles_select_authenticated", { for: "select", to: authenticatedRole, using: sql`true` }),
  ],
);

export const seasons = pgTable(
  "seasons",
  {
    titleId: titleRef("cascade"),
    number: smallint("number").notNull(),
    name: text("name").notNull().default(""),
    episodeCount: smallint("episode_count"),
    year: smallint("year"),
    posterPath: text("poster_path"),
  },
  (table) => [
    primaryKey({ columns: [table.titleId, table.number] }),
    pgPolicy("seasons_select_authenticated", { for: "select", to: authenticatedRole, using: sql`true` }),
  ],
);

export const watchLogs = pgTable(
  "watch_logs",
  {
    id: id(),
    userId: userRef("user_id"),
    titleId: titleRef(),
    /** Só em série: a temporada que terminou. */
    seasonNumber: smallint("season_number"),
    watchedOn: date("watched_on", { mode: "string" }).notNull(),
    rating: rating("rating"),
    review: text("review").notNull().default(""),
    liked: boolean("liked").notNull().default(false),
    rewatch: boolean("rewatch").notNull().default(false),
    /** "Juntos": só passa a valer com o vínculo de casal (fase 4). */
    together: boolean("together").notNull().default(false),
    /** Liga a sessão "juntos" ao registro espelhado do par. */
    groupId: uuid("group_id"),
    isPrivate: boolean("is_private").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("watch_logs_group_idx").on(table.groupId),
    index("watch_logs_user_date_idx").on(table.userId, table.watchedOn.desc(), table.createdAt.desc()),
    index("watch_logs_title_idx").on(table.titleId),
    check("watch_logs_rating", ratingCheck(table.rating)),
    ...ownedPolicies("watch_logs", table.userId, table.isPrivate),
  ],
);

export const titleRatings = pgTable(
  "title_ratings",
  {
    id: id(),
    userId: userRef("user_id"),
    titleId: titleRef(),
    /** Nota atual do filme ou da série inteira. */
    rating: rating("rating"),
    liked: boolean("liked").notNull().default(false),
    isPrivate: boolean("is_private").notNull().default(false),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("title_ratings_user_title_key").on(table.userId, table.titleId),
    check("title_ratings_rating", ratingCheck(table.rating)),
    ...ownedPolicies("title_ratings", table.userId, table.isPrivate),
  ],
);

export const seasonRatings = pgTable(
  "season_ratings",
  {
    id: id(),
    userId: userRef("user_id"),
    titleId: titleRef(),
    seasonNumber: smallint("season_number").notNull(),
    rating: rating("rating").notNull(),
    isPrivate: boolean("is_private").notNull().default(false),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("season_ratings_user_title_season_key").on(table.userId, table.titleId, table.seasonNumber),
    check("season_ratings_rating", ratingCheck(table.rating)),
    ...ownedPolicies("season_ratings", table.userId, table.isPrivate),
  ],
);

export const plotsWatchlist = pgTable(
  "watchlist",
  {
    id: id(),
    userId: userRef("user_id"),
    titleId: titleRef(),
    note: text("note").notNull().default(""),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("watchlist_user_title_key").on(table.userId, table.titleId),
    pgPolicy("watchlist_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${isMine(table.userId)} or ${isPartners(table.userId)}`,
    }),
    pgPolicy("watchlist_insert_own", { for: "insert", to: authenticatedRole, withCheck: isMine(table.userId) }),
    pgPolicy("watchlist_update_own", { for: "update", to: authenticatedRole, using: isMine(table.userId), withCheck: isMine(table.userId) }),
    pgPolicy("watchlist_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${isMine(table.userId)} or ${isPartners(table.userId)}`,
    }),
  ],
);

export const customLists = pgTable(
  "custom_lists",
  {
    id: id(),
    ownerId: userRef("owner_id"),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    isPrivate: boolean("is_private").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("custom_lists_owner_idx").on(table.ownerId),
    check("custom_lists_name_length", sql`char_length(${table.name}) between 1 and 60`),
    ...ownedPolicies("custom_lists", table.ownerId, table.isPrivate),
  ],
);

const listVisible = (listId: AnyPgColumn) =>
  sql`exists (select 1 from public.custom_lists l where l.id = ${listId} and (l.owner_id = ${authUid} or not l.is_private or l.owner_id = public.partner_of(${authUid})))`;
const listMine = (listId: AnyPgColumn) =>
  sql`exists (select 1 from public.custom_lists l where l.id = ${listId} and l.owner_id = ${authUid})`;

export const listItems = pgTable(
  "list_items",
  {
    id: id(),
    listId: uuid("list_id")
      .notNull()
      .references(() => customLists.id, { onDelete: "cascade" }),
    titleId: titleRef(),
    position: integer("position").notNull().default(0),
    note: text("note").notNull().default(""),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("list_items_list_title_key").on(table.listId, table.titleId),
    index("list_items_list_position_idx").on(table.listId, table.position),
    pgPolicy("list_items_select_visible", { for: "select", to: authenticatedRole, using: listVisible(table.listId) }),
    pgPolicy("list_items_insert_own", { for: "insert", to: authenticatedRole, withCheck: listMine(table.listId) }),
    pgPolicy("list_items_update_own", { for: "update", to: authenticatedRole, using: listMine(table.listId), withCheck: listMine(table.listId) }),
    pgPolicy("list_items_delete_own", { for: "delete", to: authenticatedRole, using: listMine(table.listId) }),
  ],
);

export const favoriteTitles = pgTable(
  "favorite_titles",
  {
    userId: userRef("user_id"),
    position: smallint("position").notNull(),
    titleId: titleRef(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.position] }),
    uniqueIndex("favorite_titles_user_title_key").on(table.userId, table.titleId),
    check("favorite_titles_position", sql`${table.position} between 1 and 4`),
    pgPolicy("favorite_titles_select_authenticated", { for: "select", to: authenticatedRole, using: sql`true` }),
    pgPolicy("favorite_titles_insert_own", { for: "insert", to: authenticatedRole, withCheck: isMine(table.userId) }),
    pgPolicy("favorite_titles_delete_own", { for: "delete", to: authenticatedRole, using: isMine(table.userId) }),
  ],
);

export type Title = typeof titles.$inferSelect;
export type NewTitle = typeof titles.$inferInsert;
export type Season = typeof seasons.$inferSelect;
export type WatchLogRow = typeof watchLogs.$inferSelect;
export type TitleRatingRow = typeof titleRatings.$inferSelect;
export type SeasonRatingRow = typeof seasonRatings.$inferSelect;
export type PlotsWatchlistRow = typeof plotsWatchlist.$inferSelect;
export type CustomListRow = typeof customLists.$inferSelect;
export type ListItemRow = typeof listItems.$inferSelect;
