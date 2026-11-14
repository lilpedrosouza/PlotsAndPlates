"use client";

import type { DiaryEntry } from "@pap/shared";
import { Heart, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Stamp } from "@/components/ui/stamp";
import { catalog } from "@/lib/plates/format";
import { dayLabel, monthKey, monthLabel, seasonTag } from "@/lib/plots/format";
import { useDiary } from "@/lib/plots/queries";
import { useOpenTitle } from "./open-title";
import { Poster } from "./poster";

/** Agrupa as sessões por mês, mantendo a ordem (mais recentes primeiro). */
function byMonth(entries: DiaryEntry[]) {
  const groups: { key: string; label: string; entries: DiaryEntry[] }[] = [];
  for (const entry of entries) {
    const key = monthKey(entry.watchedOn);
    const last = groups.at(-1);
    if (last?.key === key) last.entries.push(entry);
    else groups.push({ key, label: monthLabel(entry.watchedOn), entries: [entry] });
  }
  return groups;
}

/** Diário de Plots: a programação da sala, mês a mês. */
export function Diary() {
  const query = useDiary();
  const entries = query.data?.pages.flatMap((page) => page.items) ?? [];
  const total = entries[0]?.serial ?? 0;
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  useEffect(() => {
    const element = sentinel.current;
    if (!element || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (items) => {
        if (items[0]?.isIntersecting && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: "600px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (query.isPending) return <DiarySkeleton />;
  if (query.isError) {
    return (
      <p role="alert" className="pt-6 text-soft">
        {query.error instanceof Error ? query.error.message : "Não deu para abrir o diário."}
      </p>
    );
  }
  if (entries.length === 0) return <EmptyDiary />;

  return (
    <div className="flex flex-col gap-8 pt-2 pb-20 md:pb-8">
      <header className="flex flex-col gap-2 border-b border-rule-strong pb-4">
        <h1 className="font-display text-[clamp(2.25rem,10vw,4rem)] leading-[1.14]">Diário</h1>
        <p className="font-micro text-[0.8125rem] text-soft">
          {total === 1 ? "1 sessão" : `${total} sessões`} no diário
        </p>
      </header>

      {byMonth(entries).map((group) => (
        <section key={group.key} aria-labelledby={`mes-${group.key}`} className="flex flex-col gap-1">
          <h2 id={`mes-${group.key}`} className="font-display text-[1.375rem] leading-[1.14] text-brand">
            {group.label}
          </h2>
          <ol className="flex flex-col">
            {group.entries.map((entry) => (
              <li key={entry.id}>
                <DiaryRow entry={entry} />
              </li>
            ))}
          </ol>
        </section>
      ))}

      <div ref={sentinel} aria-hidden />
      {isFetchingNextPage ? <p className="font-micro text-center text-[0.75rem] text-soft">Carregando mais…</p> : null}
    </div>
  );
}

function DiaryRow({ entry }: { entry: DiaryEntry }) {
  const open = useOpenTitle();
  const href = `/plots/t/${entry.titleId}`;
  const tag = seasonTag(entry.seasonNumber);
  return (
    <Link
      href={href}
      onClick={(event) => open(event, href)}
      className="flex items-center gap-3.5 border-b border-rule py-3 transition-colors duration-fast hover:bg-sunken/70"
    >
      <div data-poster className="w-12 shrink-0">
        <Poster path={entry.title.posterPath} title={entry.title.title} size="w92" seed={entry.titleId} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display truncate text-[1.0625rem] leading-tight">
          {entry.title.title}
          {tag ? <span className="text-brand"> · {tag}</span> : null}
        </p>
        <p className="font-micro mt-1 flex flex-wrap items-center gap-x-2 text-[0.6875rem] text-soft">
          <span>{dayLabel(entry.watchedOn)}</span>
          <span aria-hidden>·</span>
          <span>Sessão nº {catalog(entry.serial)}</span>
          {entry.rewatch ? (
            <span className="inline-flex items-center gap-1">
              <RotateCcw aria-hidden className="size-3" />
              Reassistido
            </span>
          ) : null}
          {entry.liked ? (
            <span className="inline-flex items-center gap-1 text-brand">
              <Heart aria-hidden className="size-3 fill-current" />
              Curtido
            </span>
          ) : null}
          {entry.isPrivate ? <span>Privado</span> : null}
        </p>
      </div>
      {entry.rating !== null ? <Stamp value={entry.rating} size="sm" /> : null}
    </Link>
  );
}

function EmptyDiary() {
  return (
    <section className="flex flex-col gap-6 pt-3">
      <h1 className="font-display text-[clamp(2.25rem,10vw,4rem)] leading-[1.14]">Nenhuma sessão ainda</h1>
      <p className="max-w-[48ch] text-[1.0625rem] leading-relaxed text-soft">
        Cada filme ou temporada que a gente assistir entra aqui, mês a mês, com a nota de cada um nos créditos.
      </p>
      <Link href="/plots/buscar" className={buttonVariants({ className: "self-start" })}>
        Buscar filme ou série
      </Link>
    </section>
  );
}

export function DiarySkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-3 pt-2">
      <Skeleton className="h-14 w-40" />
      {[0, 1, 2, 3, 4].map((index) => (
        <div key={index} className="flex items-center gap-3.5 py-2">
          <Skeleton className="aspect-[2/3] w-12" />
          <div className="flex-1">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="mt-2 h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
