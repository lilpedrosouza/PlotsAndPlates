"use client";

import { MutationCache, QueryClient, QueryClientProvider, notifyManager } from "@tanstack/react-query";
import { LazyMotion, MotionConfig } from "motion/react";
import { type ReactNode, startTransition, useState } from "react";
import { refreshAchievements } from "@/lib/achievements/queries";
import { ApiRequestError } from "@/lib/api";
import { AuthProvider } from "@/lib/auth";
import { TransitionRouterProvider } from "@/lib/transition-router";

/**
 * Dados que chegam da API (respostas, invalidações, refetch) renderizam numa
 * transição: o React fatia e interrompe esse trabalho, e um toque no meio dele
 * responde na hora. Antes, a volta de uma lista renderizava tudo de uma vez
 * (até ~200 ms com a CPU 4x mais lenta) e segurava o quadro do toque seguinte.
 */
notifyManager.setBatchNotifyFunction((callback) => startTransition(callback));

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

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* `m` + LazyMotion mantém o Motion fora do bundle inicial; reducedMotion segue o sistema. */}
        <LazyMotion features={loadMotionFeatures} strict>
          <MotionConfig reducedMotion="user">
            <TransitionRouterProvider>{children}</TransitionRouterProvider>
          </MotionConfig>
        </LazyMotion>
      </AuthProvider>
    </QueryClientProvider>
  );
}
