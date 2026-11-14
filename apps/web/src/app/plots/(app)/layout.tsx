import type { ReactNode } from "react";
import { AddSeal } from "@/components/plots/add-seal";
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
      <AddSeal />
    </AuthGate>
  );
}
