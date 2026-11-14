import type { Metadata } from "next";
import type { ReactNode } from "react";
import { WorldFrame } from "@/components/shell/world-frame";
import { plotsFonts } from "@/styles/fonts-plots";

export const metadata: Metadata = { title: { default: "Plots", template: "%s · Plots · PAP" } };

export default function PlotsLayout({ children }: { children: ReactNode }) {
  return (
    <WorldFrame section="plots" fontClass={plotsFonts}>
      {children}
    </WorldFrame>
  );
}
