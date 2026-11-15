import type { Metadata } from "next";
import { Jost } from "next/font/google";
import type { ReactNode } from "react";
import { WorldFrame } from "@/components/shell/world-frame";

// As fontes são chamadas aqui, no layout, e não num módulo compartilhado: o Next
// pré-carrega uma fonte nas rotas do arquivo que a chama. Assim cada mundo só
// pré-carrega as próprias fontes.
/** Futura de cartaz: títulos e texto de Plots. */
const jost = Jost({ subsets: ["latin"], variable: "--font-jost", display: "swap" });

export const metadata: Metadata = { title: { default: "Plots", template: "%s · Plots · PAP" } };

export default function PlotsLayout({ children }: { children: ReactNode }) {
  return (
    <WorldFrame section="plots" fontClass={jost.variable}>
      {children}
    </WorldFrame>
  );
}
