"use client";

import { type ReactNode, createContext, use } from "react";
import type { Section } from "@/lib/section";

const SectionContext = createContext<Section>("plates");

export function SectionProvider({ section, children }: { section: Section; children: ReactNode }) {
  return <SectionContext value={section}>{children}</SectionContext>;
}

/** Mundo em que o componente está sendo renderizado. */
export function useSection(): Section {
  return use(SectionContext);
}
