import type { ReactNode } from "react";
import { PortaFrame } from "@/components/auth/porta-frame";
import { platesFonts } from "@/styles/fonts-plates";
import { plotsFonts } from "@/styles/fonts-plots";

/** Porta de entrada: os dois mundos na mesma tela, cartaz em cima e rótulo embaixo. */
export default function PortaLayout({ children }: { children: ReactNode }) {
  return <PortaFrame fontClass={`${platesFonts} ${plotsFonts}`}>{children}</PortaFrame>;
}
