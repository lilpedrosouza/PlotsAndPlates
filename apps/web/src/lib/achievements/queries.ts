"use client";

import type { AchievementKey, MyAchievements, PublicAchievement } from "@pap/shared";
import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { useAuth } from "../auth";

export const achievementsKeys = {
  all: ["achievements"] as const,
  mine: () => [...achievementsKeys.all, "mine"] as const,
  of: (username: string) => [...achievementsKeys.all, "of", username] as const,
};

/** Catálogo com progresso; a API confere antes, então abrir já destrava o que foi alcançado. */
export function useMyAchievements() {
  const auth = useAuth();
  return useQuery({
    queryKey: achievementsKeys.mine(),
    queryFn: () => api<MyAchievements>("/me/achievements"),
    enabled: auth.status === "in",
    staleTime: 5 * 60_000,
  });
}

export function usePublicAchievements(username: string) {
  const auth = useAuth();
  return useQuery({
    queryKey: achievementsKeys.of(username),
    queryFn: async () => (await api<{ items: PublicAchievement[] }>(`/profiles/${encodeURIComponent(username)}/achievements`)).items,
    enabled: auth.status === "in" && username.length > 0,
  });
}

/** A animação de desbloqueio já foi mostrada. */
export function useMarkSeen() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { skipAchievements: true },
    mutationFn: (keys: AchievementKey[]) => api<void>("/me/achievements/seen", { method: "POST", body: { keys } }),
    onMutate: (keys) => {
      queryClient.setQueryData<MyAchievements>(achievementsKeys.mine(), (current) =>
        current ? { items: current.items.map((item) => (keys.includes(item.key) ? { ...item, seen: true } : item)) } : current,
      );
    },
  });
}

/** Depois de qualquer ação que deu certo, as conquistas podem ter mudado. */
export function refreshAchievements(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: achievementsKeys.mine() });
}
