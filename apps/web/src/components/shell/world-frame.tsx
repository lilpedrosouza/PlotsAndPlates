"use client";

import { type ReactNode, useEffect } from "react";
import { useMe } from "@/lib/queries";
import { type Section, rememberSection } from "@/lib/section";
import { cn } from "@/lib/utils";
import { BottomBar, TopBar } from "./nav";
import { SectionProvider } from "./section-context";

const THEME_COLOR: Record<Section, string> = { plates: "#f3e9d6", plots: "#0c0c0e" };

/**
 * O invólucro de um mundo: aplica o tema, as fontes e a cor de destaque da
 * pessoa, e monta o cabeçalho e a barra inferior.
 */
export function WorldFrame({ section, fontClass, children }: { section: Section; fontClass: string; children: ReactNode }) {
  const accent = useMe().data?.profile?.accent ?? "padrao";

  useEffect(() => {
    rememberSection(section);
    // A barra do sistema acompanha o mundo.
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = THEME_COLOR[section];
  }, [section]);

  return (
    <SectionProvider section={section}>
      <div
        data-theme={section}
        data-accent={accent}
        className={cn(fontClass, "flex min-h-dvh flex-col")}
      >
        <TopBar section={section} />
        <main className="px-page mx-auto w-full max-w-5xl flex-1 pb-28 md:pb-16">
          {children}
        </main>
        <BottomBar section={section} />
      </div>
    </SectionProvider>
  );
}
