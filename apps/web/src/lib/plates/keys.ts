import type { RestaurantListQuery } from "@pap/shared";

/** Chaves do TanStack Query de Plates. Invalidar `all` atualiza tudo. */
export const platesKeys = {
  all: ["plates"] as const,
  lists: () => [...platesKeys.all, "list"] as const,
  list: (filters: RestaurantListQuery) => [...platesKeys.lists(), filters] as const,
  map: () => [...platesKeys.all, "map"] as const,
  detail: (id: string) => [...platesKeys.all, "detail", id] as const,
  autocomplete: (q: string, near?: string) => [...platesKeys.all, "autocomplete", q, near ?? ""] as const,
  live: (placeId: string) => [...platesKeys.all, "live", placeId] as const,
};
