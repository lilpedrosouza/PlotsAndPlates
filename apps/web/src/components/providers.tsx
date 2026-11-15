"use client";

import { MutationCache, QueryClient, useQueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { LazyMotion, MotionConfig } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";
import { refreshAchievements } from "@/lib/achievements/queries";
import { ApiRequestError } from "@/lib/api";
import { AuthProvider, useAuth } from "@/lib/auth";
import { clearLcpHints } from "@/lib/lcp-hints";
import { CACHE_MAX_AGE, clearPersistedCache, persistOptions } from "@/lib/persist";
import { TransitionRouterProvider } from "@/lib/transition-router";

/** Animações de layout (reordenar o caderno) precisam do pacote completo; ele chega sob demanda. */
const loadMotionFeatures = () => import("@/lib/motion-features").then((module) => module.default);

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => {
    const client: QueryClient = new QueryClient({
      // Qualquer ação que deu certo pode ter destravado uma conquista (e o Wrapped mudou).
      mutationCache: new MutationCache({
        onSuccess: (_data, _variables, _context, mutation) => {
          if (mutation.meta?.skipAchievements) return;
          refreshAchievements(client);
          void client.invalidateQueries({ queryKey: ["wrapped"] });
        },
      }),
      defaultOptions: {
        queries: {
          staleTime: 60_000,
          // O que fica guardado no aparelho precisa continuar no cache enquanto vale.
          gcTime: CACHE_MAX_AGE,
          refetchOnWindowFocus: false,
          retry: (failureCount, error) => {
            // Erros de regra (4xx) não melhoram tentando de novo.
            if (error instanceof ApiRequestError && error.status >= 400 && error.status < 500) return false;
            return failureCount < 2;
          },
        },
      },
    });
    return client;
  });
  const [persist] = useState(persistOptions);

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persist}>
      <AuthProvider>
        <CacheGuard />
        {/* `m` + LazyMotion mantém o Motion fora do bundle inicial; reducedMotion segue o sistema. */}
        <LazyMotion features={loadMotionFeatures} strict>
          <MotionConfig reducedMotion="user">
            <TransitionRouterProvider>{children}</TransitionRouterProvider>
          </MotionConfig>
        </LazyMotion>
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}

/** Sessão encerrada (sair, expirou, outra pessoa no aparelho): nada do que estava guardado fica. */
function CacheGuard() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  useEffect(() => {
    if (auth.status !== "out") return;
    queryClient.clear();
    clearPersistedCache();
    clearLcpHints();
  }, [auth.status, queryClient]);
  return null;
}
