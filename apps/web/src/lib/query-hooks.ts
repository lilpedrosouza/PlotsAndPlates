"use client";

import { useInfiniteQuery as useInfiniteQueryBase, useQuery as useQueryBase } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * `false` enquanto o React hidrata o HTML do servidor; `true` em qualquer outra
 * renderização no navegador. (O useSyncExternalStore usa o valor "do servidor"
 * só durante a hidratação.)
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

/**
 * Durante a hidratação, a consulta olha para uma chave vazia e desligada: a tela
 * renderiza igual ao HTML do servidor (esqueleto). Sem isso, a última versão
 * guardada no aparelho (lib/persist) chega entre uma parte e outra da hidratação
 * e o React descarta a árvore (erro #418). Logo depois, a chave real volta e o
 * cache aparece na hora.
 */
function duringHydration<T extends { queryKey: readonly unknown[] }>(options: T, hydrated: boolean): T {
  if (hydrated) return options;
  return { ...options, queryKey: ["hidratando", ...options.queryKey], enabled: false };
}

export const useQuery = ((options: Parameters<typeof useQueryBase>[0], client?: Parameters<typeof useQueryBase>[1]) =>
  useQueryBase(duringHydration(options, useHydrated()), client)) as typeof useQueryBase;

export const useInfiniteQuery = ((options: Parameters<typeof useInfiniteQueryBase>[0], client?: Parameters<typeof useInfiniteQueryBase>[1]) =>
  useInfiniteQueryBase(duringHydration(options, useHydrated()), client)) as typeof useInfiniteQueryBase;
