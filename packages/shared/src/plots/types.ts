import type { TitleKind, TmdbType } from "./kind";

export type TmdbSearchResult = {
  tmdbType: TmdbType;
  tmdbId: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  kind: TitleKind;
};

export type Provider = { id: number; name: string; logoPath: string | null };
export type WatchProviders = { link: string | null; flatrate: Provider[]; rent: Provider[]; buy: Provider[] };

export type TitleSummary = {
  id: string;
  tmdbType: TmdbType;
  kind: TitleKind;
  title: string;
  year: number | null;
  posterPath: string | null;
  runtime: number | null;
  seasonCount: number | null;
};

export type SeasonInfo = {
  number: number;
  name: string;
  episodeCount: number | null;
  year: number | null;
  posterPath: string | null;
  myRating: number | null;
};

export type WatchLog = {
  id: string;
  titleId: string;
  seasonNumber: number | null;
  watchedOn: string;
  rating: number | null;
  review: string;
  liked: boolean;
  rewatch: boolean;
  isPrivate: boolean;
};

export type DiaryEntry = WatchLog & { title: TitleSummary; serial: number };

export type TitleDetail = TitleSummary & {
  originalTitle: string;
  overview: string;
  backdropPath: string | null;
  genres: string[];
  directors: string[];
  cast: { name: string; character: string }[];
  providers: WatchProviders | null;
  seasons: SeasonInfo[];
  myRating: { rating: number | null; liked: boolean; isPrivate: boolean } | null;
  /** Média das notas das temporadas (sugestão para a nota da série). */
  seasonSuggestion: number | null;
  logs: WatchLog[];
  inWatchlist: boolean;
  favorite: boolean;
  lists: { id: string; name: string; hasTitle: boolean }[];
  fetchedAt: string;
};

export type WatchlistItem = { title: TitleSummary; note: string; addedAt: string; onMyStreamings: Provider[] };

export type CustomList = {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  itemCount: number;
  posters: string[];
};

export type CustomListDetail = CustomList & {
  isMine: boolean;
  items: { id: string; note: string; title: TitleSummary }[];
};
