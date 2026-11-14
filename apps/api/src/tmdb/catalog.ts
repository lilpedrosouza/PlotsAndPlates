import {
  type Db,
  type NewTitle,
  type TitleProviders,
  favoriteTitles,
  listItems,
  plotsWatchlist,
  seasonRatings,
  seasons,
  titleRatings,
  titles,
  watchLogs,
} from "@pap/db";
import { type TmdbSearchResult, type TmdbType, kindFromTmdb } from "@pap/shared";
import { and, asc, eq, lt, notExists, sql } from "drizzle-orm";
import { pgErrorCode } from "../errors";
import { createTtlCache } from "../places/cache";

const PG_FOREIGN_KEY_VIOLATION = "23503";
import { type TmdbClient, TmdbNotFound, TmdbUnavailable } from "./client";

/**
 * Catálogo de Plots: os dados do TMDB guardados no banco. Abrir um título usa
 * o que já está guardado se tiver menos de 30 dias; a tarefa agendada garante
 * que nada passe de 6 meses.
 */

export type Catalog = {
  /** Busca no TMDB (filmes e séries). Não grava nada. */
  search: (q: string, page: number) => Promise<TmdbSearchResult[]>;
  /** Garante o título no catálogo e devolve o id do PAP. */
  ensure: (type: TmdbType, tmdbId: number) => Promise<string>;
  /** Atualiza se tiver mais de 30 dias; falha do TMDB é silenciosa. */
  refreshIfStale: (titleId: string) => Promise<void>;
  /** Atualiza até `limit` títulos com mais de `days` dias. Devolve quantos. */
  refreshOlderThan: (days: number, limit: number) => Promise<number>;
  /** Apaga títulos velhos que ninguém usa. Devolve quantos. */
  pruneUnused: (days: number) => Promise<number>;
};

export const FRESH_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const CAST_SIZE = 8;

type Named = { id?: number; name: string };
type RawProvider = { provider_id: number; provider_name: string; logo_path: string | null };
type RawProviders = { results?: { BR?: { link?: string; flatrate?: RawProvider[]; rent?: RawProvider[]; buy?: RawProvider[] } } };

type RawMovie = {
  id: number;
  title: string;
  original_title?: string;
  release_date?: string;
  runtime?: number | null;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  original_language?: string;
  genres?: Named[];
  credits?: { cast?: { name: string; character?: string; order?: number }[]; crew?: { job?: string; name: string }[] };
  "watch/providers"?: RawProviders;
};

type RawShow = {
  id: number;
  name: string;
  original_name?: string;
  first_air_date?: string;
  episode_run_time?: number[];
  number_of_seasons?: number;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  original_language?: string;
  genres?: Named[];
  created_by?: { name: string }[];
  aggregate_credits?: { cast?: { name: string; roles?: { character?: string }[]; order?: number }[] };
  seasons?: { season_number: number; name?: string; episode_count?: number; air_date?: string | null; poster_path?: string | null }[];
  "watch/providers"?: RawProviders;
};

type RawSearchItem = {
  media_type: string;
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  genre_ids?: number[];
  original_language?: string;
};

const yearOf = (value: string | null | undefined) => {
  const year = Number(value?.slice(0, 4));
  return Number.isInteger(year) && year > 1800 ? year : null;
};

function mapProviders(raw: RawProviders | undefined): TitleProviders | null {
  const br = raw?.results?.BR;
  if (!br) return null;
  const list = (items: RawProvider[] | undefined) =>
    (items ?? []).map((item) => ({ id: item.provider_id, name: item.provider_name, logoPath: item.logo_path ?? null }));
  return { link: br.link ?? null, flatrate: list(br.flatrate), rent: list(br.rent), buy: list(br.buy) };
}

const genreIds = (genres: Named[] | undefined) => (genres ?? []).map((genre) => genre.id).filter((id): id is number => typeof id === "number");

function mapMovie(raw: RawMovie, fetchedAt: Date): NewTitle {
  return {
    tmdbType: "movie",
    tmdbId: raw.id,
    kind: kindFromTmdb({ type: "movie", genreIds: genreIds(raw.genres), originalLanguage: raw.original_language ?? "" }),
    title: raw.title,
    originalTitle: raw.original_title ?? "",
    year: yearOf(raw.release_date),
    runtime: raw.runtime || null,
    overview: raw.overview ?? "",
    posterPath: raw.poster_path ?? null,
    backdropPath: raw.backdrop_path ?? null,
    genres: (raw.genres ?? []).map((genre) => genre.name),
    credits: {
      directors: (raw.credits?.crew ?? []).filter((person) => person.job === "Director").map((person) => person.name),
      cast: [...(raw.credits?.cast ?? [])]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .slice(0, CAST_SIZE)
        .map((person) => ({ name: person.name, character: person.character ?? "" })),
    },
    seasonCount: null,
    providers: mapProviders(raw["watch/providers"]),
    fetchedAt,
  };
}

function mapShow(raw: RawShow, fetchedAt: Date): NewTitle {
  return {
    tmdbType: "tv",
    tmdbId: raw.id,
    kind: kindFromTmdb({ type: "tv", genreIds: genreIds(raw.genres), originalLanguage: raw.original_language ?? "" }),
    title: raw.name,
    originalTitle: raw.original_name ?? "",
    year: yearOf(raw.first_air_date),
    runtime: raw.episode_run_time?.[0] || null,
    overview: raw.overview ?? "",
    posterPath: raw.poster_path ?? null,
    backdropPath: raw.backdrop_path ?? null,
    genres: (raw.genres ?? []).map((genre) => genre.name),
    credits: {
      directors: (raw.created_by ?? []).map((person) => person.name),
      cast: [...(raw.aggregate_credits?.cast ?? [])]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .slice(0, CAST_SIZE)
        .map((person) => ({ name: person.name, character: person.roles?.[0]?.character ?? "" })),
    },
    seasonCount: raw.number_of_seasons ?? null,
    providers: mapProviders(raw["watch/providers"]),
    fetchedAt,
  };
}

export function createCatalog(deps: { db: Db; client: TmdbClient | null; now?: () => Date }): Catalog {
  const { db, client } = deps;
  const now = deps.now ?? (() => new Date());
  const searches = createTtlCache<TmdbSearchResult[]>({ ttlMs: 10 * 60_000, max: 300 });
  const isFresh = (fetchedAt: Date) => now().getTime() - fetchedAt.getTime() < FRESH_DAYS * DAY_MS;

  /** Busca no TMDB e grava (insere ou atualiza). Mantém o tipo se alguém já o trocou. */
  async function fetchAndStore(type: TmdbType, tmdbId: number): Promise<string> {
    if (!client) throw new TmdbUnavailable("O TMDB não está configurado.");
    const fetchedAt = now();
    let values: NewTitle;
    let rawSeasons: RawShow["seasons"] = [];
    if (type === "movie") {
      values = mapMovie((await client.movie(tmdbId)) as RawMovie, fetchedAt);
    } else {
      const raw = (await client.tv(tmdbId)) as RawShow;
      values = mapShow(raw, fetchedAt);
      rawSeasons = raw.seasons ?? [];
    }
    const { kind: _kind, tmdbType: _type, tmdbId: _id, ...updatable } = values;
    const [row] = await db
      .insert(titles)
      .values(values)
      .onConflictDoUpdate({ target: [titles.tmdbType, titles.tmdbId], set: updatable })
      .returning({ id: titles.id });
    if (!row) throw new Error("O título não foi gravado.");

    const kept = (rawSeasons ?? []).filter((season) => season.season_number > 0 || (season.episode_count ?? 0) > 0);
    for (const season of kept) {
      const seasonValues = {
        name: season.name ?? "",
        episodeCount: season.episode_count ?? null,
        year: yearOf(season.air_date),
        posterPath: season.poster_path ?? null,
      };
      await db
        .insert(seasons)
        .values({ titleId: row.id, number: season.season_number, ...seasonValues })
        .onConflictDoUpdate({ target: [seasons.titleId, seasons.number], set: seasonValues });
    }
    return row.id;
  }

  async function refresh(titleId: string): Promise<boolean> {
    const [row] = await db.select({ tmdbType: titles.tmdbType, tmdbId: titles.tmdbId }).from(titles).where(eq(titles.id, titleId));
    if (!row) return false;
    try {
      await fetchAndStore(row.tmdbType as TmdbType, row.tmdbId);
      return true;
    } catch {
      return false;
    }
  }

  return {
    search: async (q, page) => {
      if (!client) throw new TmdbUnavailable("O TMDB não está configurado.");
      const key = `${page}:${q.trim().toLowerCase()}`;
      const hit = searches.get(key);
      if (hit) return hit;
      const data = (await client.search(q, page)) as { results?: RawSearchItem[] };
      const results = (data.results ?? [])
        .filter((item) => item.media_type === "movie" || item.media_type === "tv")
        .map((item) => {
          const type = item.media_type as TmdbType;
          return {
            tmdbType: type,
            tmdbId: item.id,
            title: (type === "movie" ? item.title : item.name) ?? "",
            year: yearOf(type === "movie" ? item.release_date : item.first_air_date),
            posterPath: item.poster_path ?? null,
            kind: kindFromTmdb({ type, genreIds: item.genre_ids ?? [], originalLanguage: item.original_language ?? "" }),
          };
        });
      searches.set(key, results);
      return results;
    },

    ensure: async (type, tmdbId) => {
      const [existing] = await db
        .select({ id: titles.id, fetchedAt: titles.fetchedAt })
        .from(titles)
        .where(and(eq(titles.tmdbType, type), eq(titles.tmdbId, tmdbId)));
      if (existing && isFresh(existing.fetchedAt)) return existing.id;
      try {
        return await fetchAndStore(type, tmdbId);
      } catch (error) {
        // Sem TMDB, o que já está guardado continua valendo.
        if (existing && !(error instanceof TmdbNotFound)) return existing.id;
        throw error;
      }
    },

    refreshIfStale: async (titleId) => {
      const [row] = await db.select({ fetchedAt: titles.fetchedAt }).from(titles).where(eq(titles.id, titleId));
      if (row && !isFresh(row.fetchedAt)) await refresh(titleId);
    },

    refreshOlderThan: async (days, limit) => {
      const cutoff = new Date(now().getTime() - days * DAY_MS);
      const stale = await db
        .select({ id: titles.id })
        .from(titles)
        .where(lt(titles.fetchedAt, cutoff))
        .orderBy(asc(titles.fetchedAt))
        .limit(limit);
      let refreshed = 0;
      for (const row of stale) if (await refresh(row.id)) refreshed += 1;
      return refreshed;
    },

    pruneUnused: async (days) => {
      const cutoff = new Date(now().getTime() - days * DAY_MS);
      const used = (table: typeof watchLogs | typeof titleRatings | typeof seasonRatings | typeof plotsWatchlist | typeof listItems | typeof favoriteTitles) =>
        notExists(db.select({ one: sql`1` }).from(table).where(eq(table.titleId, titles.id)));
      const candidates = await db
        .select({ id: titles.id })
        .from(titles)
        .where(
          and(
            lt(titles.fetchedAt, cutoff),
            used(watchLogs),
            used(titleRatings),
            used(seasonRatings),
            used(plotsWatchlist),
            used(listItems),
            used(favoriteTitles),
          ),
        );
      let removed = 0;
      for (const { id } of candidates) {
        try {
          // Um por vez: se alguém acabou de registrar o título, o banco recusa
          // a exclusão (restrict) e ele só fica de fora desta limpeza.
          const rows = await db.delete(titles).where(eq(titles.id, id)).returning({ id: titles.id });
          removed += rows.length;
        } catch (error) {
          if (pgErrorCode(error) !== PG_FOREIGN_KEY_VIOLATION) throw error;
        }
      }
      return removed;
    },
  };
}
