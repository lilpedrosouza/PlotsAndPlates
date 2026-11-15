"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSection } from "@/components/shell/section-context";
import { cn } from "@/lib/utils";
import { useWrappedYears } from "@/lib/wrapped/queries";

/** "Seu ano no PAP": um bilhete por ano com dados (o atual é "até agora"). */
export function WrappedCard() {
  const section = useSection();
  const years = useWrappedYears();
  const list = years.data ?? [];
  if (!years.isSuccess || list.length === 0) return null;
  const current = new Date().getFullYear();

  return (
    <section aria-labelledby="wrapped-titulo" className="flex flex-col gap-4 border-t border-rule-strong pt-5">
      <h2 id="wrapped-titulo" className="font-display text-2xl leading-[1.14]">
        Seu ano no PAP
      </h2>
      <ul className="flex gap-3 overflow-x-auto pb-1">
        {list.map((year) => (
          <li key={year} className="shrink-0">
            <Link
              href={`/${section}/wrapped/${year}`}
              className={cn(
                "flex h-28 w-24 flex-col justify-between p-3 transition-transform duration-fast active:scale-95",
                section === "plates" ? "frame-label bg-surface" : "border border-rule-strong bg-surface",
                year === current && "bg-brand text-on-brand",
              )}
            >
              <span className="font-display text-[1.75rem] leading-none tabular-nums">{year}</span>
              <span className={cn("font-micro text-[0.6875rem]", year === current ? "text-on-brand" : "text-soft")}>
                {year === current ? "até agora" : "rever"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Em dezembro e na primeira semana de janeiro, o aviso no topo do caderno e do diário.
 * Depende da data de hoje, então não entra no HTML pré-renderizado (o Suspense segura).
 */
export function WrappedBanner() {
  return (
    <Suspense fallback={null}>
      <WrappedBannerNow />
    </Suspense>
  );
}

function WrappedBannerNow() {
  const section = useSection();
  const years = useWrappedYears();
  const now = new Date();
  const year = now.getMonth() === 11 ? now.getFullYear() : now.getMonth() === 0 && now.getDate() <= 7 ? now.getFullYear() - 1 : null;
  if (year === null || !years.data?.includes(year)) return null;
  return (
    <Link
      href={`/${section}/wrapped/${year}`}
      className={cn(
        "mb-6 flex items-center justify-between gap-4 bg-brand p-4 text-on-brand transition-[filter] duration-fast hover:brightness-110",
        section === "plates" ? "rounded-sm" : "",
      )}
    >
      <span className="font-display text-[1.25rem] leading-tight">O {year} de vocês chegou</span>
      <span className="font-micro text-[0.75rem]">Ver o Wrapped →</span>
    </Link>
  );
}
