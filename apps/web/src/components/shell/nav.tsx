"use client";

import { BookOpenText, Bookmark, CircleUserRound, Clapperboard, type LucideIcon, Map as MapIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Section } from "@/lib/section";
import { cn } from "@/lib/utils";
import { SectionSwitch } from "./section-switch";
import { Wordmark } from "./wordmark";

type NavItem = { href: string; label: string; icon: LucideIcon; /** Outras rotas em que o item fica ativo. */ also?: RegExp };

/**
 * Destinos de cada mundo: dois de cada lado do alternador no celular.
 * Plates: Caderno, Mapa | Quero ir, Perfil. Plots ganha os dele na fase 3.
 */
function navItems(section: Section): { start: NavItem[]; end: NavItem[] } {
  if (section === "plates") {
    return {
      start: [
        { href: "/plates", label: "Caderno", icon: BookOpenText, also: /^\/plates\/(r\/|novo)/ },
        { href: "/plates/mapa", label: "Mapa", icon: MapIcon },
      ],
      end: [
        { href: "/plates/quero-ir", label: "Quero ir", icon: Bookmark },
        { href: "/plates/perfil", label: "Perfil", icon: CircleUserRound },
      ],
    };
  }
  return {
    start: [{ href: "/plots", label: "Diário", icon: Clapperboard }],
    end: [{ href: "/plots/perfil", label: "Perfil", icon: CircleUserRound }],
  };
}

function NavLink({ item, variant }: { item: NavItem; variant: "bar" | "inline" }) {
  const pathname = usePathname();
  const active = pathname === item.href || Boolean(item.also?.test(pathname));
  const Icon = item.icon;

  if (variant === "inline") {
    return (
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "font-micro flex h-11 items-center gap-2 px-3 text-[0.9375rem] transition-colors duration-fast",
          active ? "text-foreground underline decoration-brand decoration-2 underline-offset-8" : "text-soft hover:text-foreground",
        )}
      >
        <Icon aria-hidden className="size-[1.1rem]" strokeWidth={1.75} />
        {item.label}
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 transition-colors duration-fast",
        active ? "text-foreground" : "text-soft",
      )}
    >
      <Icon aria-hidden className="size-6" strokeWidth={active ? 2.1 : 1.6} />
      <span className="font-micro text-[0.75rem] leading-none">{item.label}</span>
    </Link>
  );
}

/** Cabeçalho: a marca viaja entre os mundos; em telas largas leva também a navegação. */
export function TopBar({ section }: { section: Section }) {
  const items = navItems(section);
  return (
    <header className="px-page mx-auto flex w-full max-w-5xl items-end justify-between gap-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-3">
      <Link href={`/${section}`} aria-label={`Início de ${section === "plates" ? "Plates" : "Plots"}`} className="rounded-sm">
        <Wordmark section={section} className={section === "plates" ? "text-[2.5rem]" : "text-[2.375rem]"} />
      </Link>
      <div className="hidden items-center gap-2 md:flex">
        {[...items.start, ...items.end].map((item) => (
          <NavLink key={item.href} item={item} variant="inline" />
        ))}
        <SectionSwitch section={section} className="ml-3" />
      </div>
    </header>
  );
}

/** Barra inferior do celular. É a única folha com sombra: fica por cima de tudo. */
export function BottomBar({ section }: { section: Section }) {
  const items = navItems(section);
  return (
    <div className="vt-chrome fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-surface shadow-sheet md:hidden">
      <nav
        aria-label="Navegação principal"
        className="mx-auto flex max-w-md items-center gap-1 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5"
      >
        {items.start.map((item) => (
          <NavLink key={item.href} item={item} variant="bar" />
        ))}
        <SectionSwitch section={section} className="shrink-0" />
        {items.end.map((item) => (
          <NavLink key={item.href} item={item} variant="bar" />
        ))}
      </nav>
    </div>
  );
}
