"use client";

import type {
  CustomList,
  CustomListDetail,
  DiaryEntry,
  Page,
  TitleDetail,
  TitleSummary,
  TmdbSearchResult,
  TmdbType,
  WatchlistItem,
  WatchlistQuery,
} from "@pap/shared";
import { keepPreviousData } from "@tanstack/react-query";
import { useInfiniteQuery, useQuery } from "@/lib/query-hooks";
import { api } from "../api";
import { useAuth } from "../auth";
import { useDebounced } from "../plates/queries";
import { plotsKeys } from "./keys";

const qs = (query: Record<string, unknown>) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== null && value !== "" && value !== false) params.set(key, String(value));
  return params.toString();
};

/** Busca no TMDB enquanto digita. */
export function useTmdbSearch(q: string) {
  const term = useDebounced(q.trim(), 300);
  return useQuery({
    queryKey: plotsKeys.search(term),
    queryFn: async () => (await api<{ results: TmdbSearchResult[] }>(`/tmdb/search?${qs({ q: term })}`)).results,
    enabled: term.length >= 1,
    staleTime: 10 * 60_000,
    placeholderData: keepPreviousData,
  });
}

/** Grava o título no catálogo (se preciso) e devolve o id do PAP. */
export async function openTmdbTitle(type: TmdbType, tmdbId: number): Promise<string> {
  return (await api<{ id: string }>(`/titles/by-tmdb/${type}/${tmdbId}`)).id;
}

export function useTitle(id: string | undefined) {
  const auth = useAuth();
  return useQuery({
    queryKey: plotsKeys.title(id ?? ""),
    queryFn: () => api<TitleDetail>(`/titles/${id}`),
    enabled: auth.status === "in" && Boolean(id),
  });
}

export function useDiary() {
  const auth = useAuth();
  return useInfiniteQuery({
    queryKey: plotsKeys.diary(),
    queryFn: ({ pageParam }) => api<Page<DiaryEntry>>(`/diary?${qs({ cursor: pageParam })}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: auth.status === "in",
  });
}

export function useWatchlist(query: WatchlistQuery) {
  const auth = useAuth();
  return useQuery({
    queryKey: plotsKeys.watchlist(query),
    queryFn: async () => (await api<{ items: WatchlistItem[] }>(`/watchlist?${qs(query)}`)).items,
    enabled: auth.status === "in",
    placeholderData: keepPreviousData,
  });
}

export function useFavorites() {
  const auth = useAuth();
  return useQuery({
    queryKey: plotsKeys.favorites(),
    queryFn: async () => (await api<{ titles: TitleSummary[] }>("/me/favorites")).titles,
    enabled: auth.status === "in",
  });
}

export function useLists() {
  const auth = useAuth();
  return useQuery({
    queryKey: plotsKeys.lists(),
    queryFn: async () => (await api<{ lists: CustomList[] }>("/lists")).lists,
    enabled: auth.status === "in",
  });
}

export function useList(id: string | undefined) {
  const auth = useAuth();
  return useQuery({
    queryKey: plotsKeys.list(id ?? ""),
    queryFn: () => api<CustomListDetail>(`/lists/${id}`),
    enabled: auth.status === "in" && Boolean(id),
  });
}
