import type { ReactNode } from "react";
import { PortaFrame } from "@/components/auth/porta-frame";
import { Besley, Jost, Sofia_Sans } from "next/font/google";

// As fontes são chamadas aqui, no layout, e não num módulo compartilhado: o Next
// pré-carrega uma fonte nas rotas do arquivo que a chama. Assim cada mundo só
// pré-carrega as próprias fontes.
/** Clarendon de rótulo: títulos de Plates. */
const besley = Besley({ subsets: ["latin"], weight: "700", variable: "--font-besley", display: "swap" });
/** Grotesca de letra corrida: texto de Plates. */
const sofia = Sofia_Sans({ subsets: ["latin"], variable: "--font-sofia", display: "swap" });
/** Futura de cartaz: títulos e texto de Plots. */
// Na porta a Jost só desenha o "Plots" do cartaz (peso 800): um arquivo estático menor.
const jost = Jost({ subsets: ["latin"], weight: "800", variable: "--font-jost", display: "swap" });

/** Porta de entrada: os dois mundos na mesma tela, cartaz em cima e rótulo embaixo. */
export default function PortaLayout({ children }: { children: ReactNode }) {
  return <PortaFrame fontClass={`${besley.variable} ${sofia.variable} ${jost.variable}`}>{children}</PortaFrame>;
}
