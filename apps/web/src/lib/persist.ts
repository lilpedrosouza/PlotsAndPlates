import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import type { Query } from "@tanstack/react-query";
import type { PersistQueryClientOptions } from "@tanstack/react-query-persist-client";
import { storedSession } from "./supabase";

/** Onde a última versão das telas fica guardada no aparelho. */
export const CACHE_KEY = "pap-cache";

/** Uma semana: depois disso a tela abre como se fosse a primeira vez. */
export const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/**
 * O que nunca vai para o aparelho:
 * - buscas e autocompletar (efêmeros);
 * - os dados ao vivo do Google (`live`): os termos do Google Maps só permitem guardar o place_id.
 */
const NEVER = new Set(["search", "autocomplete", "live"]);

export function shouldPersist(query: Query): boolean {
  if (query.state.status !== "success") return false;
  return !query.queryKey.some((part) => typeof part === "string" && NEVER.has(part));
}

/**
 * A última versão das listas, perfis e fichas fica no localStorage: a tela abre
 * com ela e a API atualiza logo em seguida. O cache é da conta da sessão
 * (`buster` = id da pessoa): com outra conta, o que estava guardado é descartado.
 * Sair da conta apaga tudo (ver `CacheGuard` em providers).
 */
export function persistOptions(): Omit<PersistQueryClientOptions, "queryClient"> {
  const storage = typeof window === "undefined" ? undefined : safeLocalStorage();
  return {
    persister: createSyncStoragePersister({ storage, key: CACHE_KEY, throttleTime: 1000 }),
    maxAge: CACHE_MAX_AGE,
    // No servidor não há sessão (nem aparelho): só o navegador lê a conta.
    buster: storage ? (storedSession()?.user.id ?? "sem-sessao") : "servidor",
    dehydrateOptions: { shouldDehydrateQuery: shouldPersist },
  };
}

/** Apaga o que estava guardado (sair da conta, sessão encerrada). */
export function clearPersistedCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // Sem armazenamento local, não havia nada guardado.
  }
}

function safeLocalStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
