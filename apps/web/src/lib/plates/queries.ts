"use client";

import type {
  AutocompleteResponse,
  LivePlace,
  MapPin,
  Page,
  PlaceResolveInput,
  RestaurantDetail,
  RestaurantDraft,
  RestaurantListQuery,
  RestaurantSummary,
} from "@pap/shared";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { platesKeys } from "./keys";

const queryString = (query: Record<string, unknown>) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== "") params.set(key, String(value));
  return params.toString();
};

/** Caderno paginado (rolagem infinita). */
export function useRestaurants(filters: RestaurantListQuery) {
  const auth = useAuth();
  return useInfiniteQuery({
    queryKey: platesKeys.list(filters),
    queryFn: ({ pageParam }) =>
      api<Page<RestaurantSummary>>(`/restaurants?${queryString({ ...filters, cursor: pageParam })}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
    enabled: auth.status === "in",
  });
}

export function useRestaurant(id: string | undefined) {
  const auth = useAuth();
  return useQuery({
    queryKey: platesKeys.detail(id ?? ""),
    queryFn: () => api<RestaurantDetail>(`/restaurants/${id}`),
    enabled: auth.status === "in" && Boolean(id),
  });
}

export function useMapPins() {
  const auth = useAuth();
  return useQuery({
    queryKey: platesKeys.map(),
    queryFn: async () => (await api<{ pins: MapPin[] }>("/restaurants/map")).pins,
    enabled: auth.status === "in",
  });
}

/** Valor que só muda depois de `delay` ms parado (para não buscar a cada tecla). */
export function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Sugestões enquanto digita. `session` agrupa as chamadas de um cadastro no Google. */
export function useAutocomplete(q: string, session: string, near?: string) {
  const term = useDebounced(q.trim());
  return useQuery({
    queryKey: platesKeys.autocomplete(term, near),
    queryFn: () => api<AutocompleteResponse>(`/places/autocomplete?${queryString({ q: term, session, near })}`),
    enabled: term.length >= 2,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function resolvePlace(input: PlaceResolveInput) {
  return api<RestaurantDraft>("/places/resolve", { method: "POST", body: input });
}

/** Painel "Ver no Google": só busca quando alguém pede; nada fica em cache. */
export function useLivePlace(placeId: string | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: platesKeys.live(placeId ?? ""),
    queryFn: () => api<LivePlace>(`/places/${placeId}/live`),
    enabled: enabled && Boolean(placeId),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}
