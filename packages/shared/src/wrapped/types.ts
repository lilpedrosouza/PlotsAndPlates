import type { PublicAchievement } from "../achievements";
import type { PersonRef, SideBySide } from "../couple";

export type WrappedComparison = {
  kind: "restaurant" | "title";
  id: string;
  name: string;
  imageUrl: string | null;
  mine: number;
  partner: number;
};

export type Wrapped = {
  year: number;
  /** Ano corrente: "até agora". */
  partial: boolean;
  /** Quem pede primeiro; o par, se houver. */
  people: PersonRef[];
  plates: {
    restaurants: number;
    visits: number;
    dishes: number;
    favoriteCuisine: { name: string; count: number } | null;
    mostVisited: { id: string; name: string; coverThumbUrl: string | null; visits: number } | null;
    champion: { id: string; name: string; coverThumbUrl: string | null; ratings: SideBySide } | null;
  };
  plots: {
    sessions: number;
    together: number;
    minutes: number;
    titles: number;
    favoriteGenre: { name: string; count: number } | null;
    mostWatched: { id: string; title: string; posterPath: string | null; tmdbType: "movie" | "tv"; sessions: number } | null;
    champion: { id: string; title: string; posterPath: string | null; tmdbType: "movie" | "tv"; ratings: SideBySide } | null;
  };
  couple: { equal: number; agreed: WrappedComparison | null; disagreed: WrappedComparison | null } | null;
  achievements: PublicAchievement[];
};

export type WrappedYears = { years: number[] };
