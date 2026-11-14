"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { SECTIONS, SECTION_LABEL, type Section, WORLD_TRANSITION, mirrorPath } from "@/lib/section";
import { useTransitionNavigate } from "@/lib/transition-router";
import { cn } from "@/lib/utils";

/**
 * Alternador Plates ↔ Plots, sempre visível. A marca do lado ativo é um bloco
 * que desliza de um lado para o outro na troca de mundo (view transition).
 */
export function SectionSwitch({ section, className }: { section: Section; className?: string }) {
  // Em rotas com id desconhecido no build (ex.: /plates/r/[id]) o caminho só
  // existe no navegador; até lá o lado inativo aponta para o início do outro mundo.
  return (
    <Suspense fallback={<SwitchView section={section} pathname={null} className={className} />}>
      <SwitchWithPath section={section} className={className} />
    </Suspense>
  );
}

function SwitchWithPath({ section, className }: { section: Section; className?: string }) {
  return <SwitchView section={section} pathname={usePathname()} className={className} />;
}

function SwitchView({ section, pathname, className }: { section: Section; pathname: string | null; className?: string }) {
  const navigate = useTransitionNavigate();

  return (
    <nav aria-label="Trocar de seção" className={className}>
      <div className="relative grid h-11 grid-cols-2 rounded-md border border-rule-strong bg-background p-[3px]">
        <span
          aria-hidden
          className={cn(
            "vt-switch-thumb absolute inset-y-[3px] w-[calc(50%-3px)] rounded-[calc(var(--pap-radius)-1px)] bg-brand",
            section === "plates" ? "left-[3px]" : "left-1/2",
          )}
        />
        {SECTIONS.map((target) => {
          const active = target === section;
          const href = active || pathname === null ? `/${target}` : mirrorPath(pathname, target);
          return (
            <Link
              key={target}
              href={href}
              aria-current={active ? "true" : undefined}
              prefetch
              onClick={(event) => {
                // Abrir em nova aba e afins seguem o comportamento normal do link.
                if (active || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                event.preventDefault();
                navigate(href, { types: [WORLD_TRANSITION[target]] });
              }}
              className={cn(
                "font-micro relative z-10 flex min-w-[4.5rem] items-center justify-center rounded-sm px-3 text-[0.9375rem] transition-colors duration-fast",
                active ? "text-on-brand" : "text-soft hover:text-foreground",
              )}
            >
              {SECTION_LABEL[target]}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
