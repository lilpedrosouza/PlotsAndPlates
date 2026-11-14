"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LazyMotion, MotionConfig } from "motion/react";
import { type ReactNode, useState } from "react";
import { ApiRequestError } from "@/lib/api";
import { AuthProvider } from "@/lib/auth";
import { TransitionRouterProvider } from "@/lib/transition-router";

/** Animações de layout (reordenar o caderno) precisam do pacote completo; ele chega sob demanda. */
const loadMotionFeatures = () => import("@/lib/motion-features").then((module) => module.default);

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
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
      }),
  );

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
