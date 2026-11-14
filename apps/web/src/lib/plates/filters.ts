import {
  PRICE_LEVELS,
  RESTAURANT_SORTS,
  RESTAURANT_STATUSES,
  type RestaurantListQuery,
  type RestaurantSort,
  type RestaurantStatus,
} from "@pap/shared";

/** Filtros do caderno que moram na URL (dá para voltar e compartilhar). */
export type NotebookFilters = {
  status: RestaurantStatus;
  sort: RestaurantSort;
  cuisine?: string;
  area?: string;
  price?: number;
  minRating?: number;
};

export const DEFAULT_FILTERS: NotebookFilters = { status: "fomos", sort: "recentes" };

const oneOf = <T extends string>(values: readonly T[], value: string | null, fallback: T): T =>
  value && (values as readonly string[]).includes(value) ? (value as T) : fallback;

export function filtersFromSearchParams(params: URLSearchParams, defaults = DEFAULT_FILTERS): NotebookFilters {
  const price = Number(params.get("preco"));
  const minRating = Number(params.get("nota"));
  return {
    status: oneOf(RESTAURANT_STATUSES, params.get("status"), defaults.status),
    sort: oneOf(RESTAURANT_SORTS, params.get("ordem"), defaults.sort),
    cuisine: params.get("cozinha") || undefined,
    area: params.get("onde") || undefined,
    price: (PRICE_LEVELS as readonly number[]).includes(price) ? price : undefined,
    minRating: minRating >= 0.5 && minRating <= 5 ? minRating : undefined,
  };
}

export function filtersToSearchParams(filters: NotebookFilters, defaults = DEFAULT_FILTERS): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.status !== defaults.status) params.set("status", filters.status);
  if (filters.sort !== defaults.sort) params.set("ordem", filters.sort);
  if (filters.cuisine) params.set("cozinha", filters.cuisine);
  if (filters.area) params.set("onde", filters.area);
  if (filters.price) params.set("preco", String(filters.price));
  if (filters.minRating) params.set("nota", String(filters.minRating));
  return params;
}

/** Quantos filtros (além de situação e ordem) estão ligados. */
export function activeFilterCount(filters: NotebookFilters): number {
  return [filters.cuisine, filters.area, filters.price, filters.minRating].filter(Boolean).length;
}

/** Filtros do caderno → query da API. */
export function toListQuery(filters: NotebookFilters): RestaurantListQuery {
  return {
    status: filters.status,
    sort: filters.sort,
    ...(filters.cuisine ? { cuisine: filters.cuisine } : {}),
    ...(filters.area ? { area: filters.area } : {}),
    ...(filters.price ? { price: filters.price } : {}),
    ...(filters.minRating ? { minRating: filters.minRating } : {}),
  };
}
