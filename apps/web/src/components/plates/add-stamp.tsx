"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

/**
 * O "+" de Plates: um carimbo redondo pousado acima da barra inferior, à
 * direita, ao alcance do polegar. Some na tela de cadastro e no mapa (onde
 * cobriria o cartão do restaurante escolhido).
 */
export function AddStamp() {
  // Depende do caminho (some no cadastro e no mapa): só aparece no navegador.
  return (
    <Suspense fallback={null}>
      <AddStampLink />
    </Suspense>
  );
}

function AddStampLink() {
  const pathname = usePathname();
  if (pathname.startsWith("/plates/novo") || pathname.startsWith("/plates/mapa")) return null;
  return (
    <Link
      href="/plates/novo"
      aria-label="Cadastrar restaurante"
      className="fixed right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-40 flex size-16 -rotate-6 flex-col items-center justify-center rounded-full bg-brand text-on-brand shadow-lift outline outline-1 -outline-offset-[5px] outline-on-brand/60 transition-transform duration-fast hover:rotate-0 active:scale-95 md:right-8 md:bottom-8"
    >
      <Plus aria-hidden className="size-6" strokeWidth={2.4} />
      <span className="font-micro text-[0.625rem] leading-none">Novo</span>
    </Link>
  );
}
