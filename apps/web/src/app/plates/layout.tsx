import type { Metadata } from "next";
import type { ReactNode } from "react";
import { WorldFrame } from "@/components/shell/world-frame";
import { platesFonts } from "@/styles/fonts-plates";

export const metadata: Metadata = { title: { default: "Plates", template: "%s · Plates · PAP" } };

export default function PlatesLayout({ children }: { children: ReactNode }) {
  return (
    <WorldFrame section="plates" fontClass={platesFonts}>
      {children}
    </WorldFrame>
  );
}
