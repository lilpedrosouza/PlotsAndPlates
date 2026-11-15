import type { Metadata } from "next";
import { Besley, Sofia_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { WorldFrame } from "@/components/shell/world-frame";

// As fontes são chamadas aqui, no layout, e não num módulo compartilhado: o Next
// pré-carrega uma fonte nas rotas do arquivo que a chama. Assim cada mundo só
// pré-carrega as próprias fontes.
/** Clarendon de rótulo: títulos de Plates. */
const besley = Besley({ subsets: ["latin"], weight: "700", variable: "--font-besley", display: "swap" });
/** Grotesca de letra corrida: texto de Plates. */
const sofia = Sofia_Sans({ subsets: ["latin"], variable: "--font-sofia", display: "swap" });

export const metadata: Metadata = { title: { default: "Plates", template: "%s · Plates · PAP" } };

export default function PlatesLayout({ children }: { children: ReactNode }) {
  return (
    <WorldFrame section="plates" fontClass={`${besley.variable} ${sofia.variable}`}>
      {children}
    </WorldFrame>
  );
}
