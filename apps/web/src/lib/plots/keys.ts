import type { WatchlistQuery } from "@pap/shared";

/** Chaves do TanStack Query de Plots. Invalidar `all` atualiza tudo. */
export const plotsKeys = {
  all: ["plots"] as const,
  search: (q: string) => [...plotsKeys.all, "search", q] as const,
  title: (id: string) => [...plotsKeys.all, "title", id] as const,
  diary: () => [...plotsKeys.all, "diary"] as const,
  watchlist: (query: WatchlistQuery) => [...plotsKeys.all, "watchlist", query] as const,
  watchlists: () => [...plotsKeys.all, "watchlist"] as const,
  favorites: () => [...plotsKeys.all, "favorites"] as const,
  lists: () => [...plotsKeys.all, "lists"] as const,
  list: (id: string) => [...plotsKeys.all, "list", id] as const,
};
