import type { ReactNode } from "react";
import { AddSeal } from "@/components/plots/add-seal";
import { TmdbAttribution } from "@/components/plots/tmdb-attribution";
import { AuthGate } from "@/components/shell/auth-gate";

/**
 * Estas páginas são cascas estáticas preenchidas no navegador depois do login,
 * então o validador de navegação instantânea não tem o que conferir aqui.
 */
export const instant = false;

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      {children}
      {/* Toda tela de Plots mostra títulos e pôsteres do TMDB: a atribuição fica no pé de todas. */}
      <div className="pb-24 md:pb-4">
        <TmdbAttribution />
      </div>
      <AddSeal />
    </AuthGate>
  );
}
