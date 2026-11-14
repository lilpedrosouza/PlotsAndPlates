"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, Suspense, createContext, use, useCallback, useLayoutEffect, useRef } from "react";

type TransitionNavigate = (href: string, options?: { types?: string[] }) => void;

const TransitionRouterContext = createContext<TransitionNavigate>(() => {});

/** Tempo máximo de espera pela nova tela antes de soltar a transição. */
const SAFETY_MS = 1500;

/**
 * Navegação dentro de uma View Transition do navegador.
 *
 * O navegador fotografa a tela atual, a gente navega, e quando a rota nova
 * termina de entrar no DOM ele fotografa de novo e anima entre as duas (as
 * animações ficam em globals.css, escolhidas pelo tipo da transição). Sem
 * suporte à API, é uma navegação comum.
 */
export function TransitionRouterProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const settle = useRef<(() => void) | null>(null);
  const release = useCallback(() => {
    settle.current?.();
    settle.current = null;
  }, []);

  const navigate = useCallback<TransitionNavigate>(
    (href, options) => {
      if (typeof document.startViewTransition !== "function") {
        router.push(href);
        return;
      }
      const update = () =>
        new Promise<void>((resolve) => {
          settle.current = resolve;
          router.push(href);
          setTimeout(resolve, SAFETY_MS);
        });
      try {
        document.startViewTransition({ update, types: options?.types ?? [] });
      } catch {
        // Navegadores que só aceitam a forma antiga, sem tipos.
        document.startViewTransition(update);
      }
    },
    [router],
  );

  return (
    <TransitionRouterContext value={navigate}>
      {/* O caminho só existe no navegador em rotas com id desconhecido no build. */}
      <Suspense fallback={null}>
        <RouteSettler onRoute={release} />
      </Suspense>
      {children}
    </TransitionRouterContext>
  );
}

/** A rota nova já está no DOM: libera a segunda fotografia da transição. */
function RouteSettler({ onRoute }: { onRoute: () => void }) {
  const pathname = usePathname();
  useLayoutEffect(() => {
    onRoute();
  }, [pathname, onRoute]);
  return null;
}

export function useTransitionNavigate(): TransitionNavigate {
  return use(TransitionRouterContext);
}
