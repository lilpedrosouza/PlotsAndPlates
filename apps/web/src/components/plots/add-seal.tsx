"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

/**
 * O "+" de Plots: um selo quadrado amarelo pousado acima da barra inferior, à
 * direita (o equivalente reto do carimbo de Plates). Leva à busca e some nela.
 */
export function AddSeal() {
  // Depende do caminho: em rotas de id dinâmico só aparece no navegador.
  return (
    <Suspense fallback={null}>
      <AddSealLink />
    </Suspense>
  );
}

function AddSealLink() {
  const pathname = usePathname();
  if (pathname.startsWith("/plots/buscar")) return null;
  return (
    <Link
      href="/plots/buscar"
      aria-label="Buscar filme ou série"
      className="fixed right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-40 flex size-14 flex-col items-center justify-center bg-brand text-on-brand shadow-lift transition-transform duration-fast active:scale-95 md:right-8 md:bottom-8"
    >
      <Plus aria-hidden className="size-6" strokeWidth={2.6} />
      <span className="font-micro text-[0.625rem] leading-none">Buscar</span>
    </Link>
  );
}
