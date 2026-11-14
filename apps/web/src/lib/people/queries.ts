"use client";

import type { CommunityPage, PublicPlatesProfile, PublicPlotsProfile, PublicProfile } from "@pap/shared";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { useAuth } from "../auth";
import { useDebounced } from "../plates/queries";

export const peopleKeys = {
  all: ["people"] as const,
  search: (q: string) => [...peopleKeys.all, "search", q] as const,
  plates: (username: string) => [...peopleKeys.all, "plates", username] as const,
  plots: (username: string) => [...peopleKeys.all, "plots", username] as const,
  community: (kind: "restaurants" | "titles", id: string) => [...peopleKeys.all, "community", kind, id] as const,
};

/** Busca de pessoas por nome ou @username (a partir de 2 letras). */
export function usePeopleSearch(q: string) {
  const auth = useAuth();
  const term = useDebounced(q.trim(), 250);
  return useQuery({
    queryKey: peopleKeys.search(term),
    queryFn: async () => (await api<{ profiles: PublicProfile[] }>(`/profiles?${new URLSearchParams({ q: term })}`)).profiles,
    enabled: auth.status === "in" && term.replace(/^@/, "").length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function usePlatesProfile(username: string) {
  const auth = useAuth();
  return useQuery({
    queryKey: peopleKeys.plates(username),
    queryFn: () => api<PublicPlatesProfile>(`/profiles/${encodeURIComponent(username)}/plates`),
    enabled: auth.status === "in" && username.length > 0,
  });
}

export function usePlotsProfile(username: string) {
  const auth = useAuth();
  return useQuery({
    queryKey: peopleKeys.plots(username),
    queryFn: () => api<PublicPlotsProfile>(`/profiles/${encodeURIComponent(username)}/plots`),
    enabled: auth.status === "in" && username.length > 0,
  });
}

/** "O que o pessoal do PAP achou", de 10 em 10. */
export function useCommunity(kind: "restaurants" | "titles", id: string | undefined) {
  const auth = useAuth();
  return useInfiniteQuery({
    queryKey: peopleKeys.community(kind, id ?? ""),
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set("cursor", pageParam);
      return api<CommunityPage>(`/${kind}/${id}/community?${params}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: auth.status === "in" && Boolean(id),
  });
}
