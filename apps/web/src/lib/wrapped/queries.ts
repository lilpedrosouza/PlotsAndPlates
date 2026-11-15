"use client";

import type { Wrapped, WrappedYears } from "@pap/shared";
import { useQuery } from "@/lib/query-hooks";
import { api } from "../api";
import { useAuth } from "../auth";

export const wrappedKeys = {
  all: ["wrapped"] as const,
  years: () => [...wrappedKeys.all, "years"] as const,
  year: (year: number) => [...wrappedKeys.all, year] as const,
};

/** Anos em que o casal registrou algo, do mais recente ao mais antigo. */
export function useWrappedYears() {
  const auth = useAuth();
  return useQuery({
    queryKey: wrappedKeys.years(),
    queryFn: async () => (await api<WrappedYears>("/wrapped")).years,
    enabled: auth.status === "in",
  });
}

export function useWrapped(year: number) {
  const auth = useAuth();
  return useQuery({
    queryKey: wrappedKeys.year(year),
    queryFn: () => api<Wrapped>(`/wrapped/${year}`),
    enabled: auth.status === "in" && Number.isInteger(year),
    staleTime: 5 * 60_000,
  });
}
