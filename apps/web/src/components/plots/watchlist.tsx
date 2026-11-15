"use client";

import { TITLE_KINDS, TITLE_KIND_LABELS, type TitleKind, type WatchlistItem, tmdbImage } from "@pap/shared";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AddedBy } from "@/components/couple/added-by";
import { PlotsDraw } from "@/components/draw/draw-buttons";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChipToggle } from "@/components/ui/chip";
import { Skeleton } from "@/components/ui/skeleton";
import { rememberLcpImages } from "@/lib/lcp-hints";
import { creditLine } from "@/lib/plots/format";
import { useTitle, useWatchlist } from "@/lib/plots/queries";
import { cn } from "@/lib/utils";
import { useOpenTitle } from "./open-title";
import { Poster } from "./poster";
import { JustWatchAttribution } from "./tmdb-attribution";

/** Quero ver: pôsteres, com a faixa "No seu …" quando está num streaming do perfil. */
export function Watchlist() {
  const [onlyMine, setOnlyMine] = useState(false);
  const [kind, setKind] = useState<TitleKind | undefined>(undefined);
  const [sort, setSort] = useState<"recentes" | "titulo">("recentes");
  const query = useWatchlist({ onlyMine: onlyMine ? "true" : undefined, kind, sort });
  const items = query.data ?? [];
  const [watching, setWatching] = useState<string | null>(null);
  const [launchKey, setLaunchKey] = useState(0);

  // Na visão padrão, os 3 primeiros pôsteres viram a dica da próxima abertura (lib/lcp-hints).
  const firstPosters = !onlyMine && !kind && sort === "recentes" && query.isSuccess
    ? items.slice(0, 3).map((item) => tmdbImage(item.title.posterPath, "w342") ?? "").join("|")
    : null;
  useEffect(() => {
    if (firstPosters !== null) rememberLcpImages("/plots/quero-ver", firstPosters.split("|"));
  }, [firstPosters]);

  return (
    <div className="flex flex-col gap-6 pt-2 pb-20 md:pb-8">
      <header className="flex flex-col gap-4">
        <h1 className="font-display text-[clamp(2.25rem,10vw,4rem)] leading-[1.14]">Quero ver</h1>
        <div>
          <PlotsDraw
            onWatched={(titleId) => {
              setLaunchKey((key) => key + 1);
              setWatching(titleId);
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtros">
          <ChipToggle pressed={onlyMine} onPressedChange={setOnlyMine}>
            Nos meus streamings
          </ChipToggle>
          {TITLE_KINDS.map((value) => (
            <ChipToggle key={value} pressed={kind === value} onPressedChange={(on) => setKind(on ? value : undefined)}>
              {TITLE_KIND_LABELS[value]}
            </ChipToggle>
          ))}
        </div>
        <div className="flex gap-2" role="group" aria-label="Ordem">
          {(
            [
              ["recentes", "Mais recentes"],
              ["titulo", "Título"],
            ] as const
          ).map(([value, label]) => (
            <Button key={value} variant={sort === value ? "secondary" : "quiet"} size="sm" aria-pressed={sort === value} onClick={() => setSort(value)}>
              {label}
            </Button>
          ))}
        </div>
      </header>

      {query.isPending ? (
        <ul className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 md:grid-cols-5">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <li key={index}>
              <Skeleton className="aspect-[2/3] w-full" />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <section className="flex flex-col items-start gap-4 border-t border-rule-strong pt-5">
          <h2 className="font-display text-[1.375rem] leading-[1.14]">{onlyMine || kind ? "Nada com esses filtros" : "Nada no quero ver"}</h2>
          <p className="max-w-[46ch] text-soft">
            {onlyMine
              ? "Nenhum título da lista está nos streamings marcados no seu perfil."
              : "Guarde aqui o que alguém indicou ou o trailer que chamou atenção."}
          </p>
          <Link href="/plots/buscar" className={buttonVariants({ variant: "secondary" })}>
            Buscar filme ou série
          </Link>
        </section>
      ) : (
        <ul className={cn("grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 md:grid-cols-5", query.isPlaceholderData && "opacity-60")}>
          {items.map((item, index) => (
            <li key={item.title.id}>
              <WatchlistCard
                item={item}
                priority={index < 3}
                onWatched={() => {
                  setLaunchKey((key) => key + 1);
                  setWatching(item.title.id);
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {/* A faixa "No seu …" vem dos dados de onde assistir da JustWatch. */}
      <JustWatchAttribution />
      {watching ? <AssistimosLauncher key={launchKey} titleId={watching} onDone={() => setWatching(null)} /> : null}
    </div>
  );
}

function WatchlistCard({ item, priority, onWatched }: { item: WatchlistItem; priority?: boolean; onWatched: () => void }) {
  const open = useOpenTitle();
  const href = `/plots/t/${item.title.id}`;
  const streaming = item.onMyStreamings[0];
  return (
    <div className="flex h-full flex-col gap-2">
      <Link href={href} onClick={(event) => open(event, href)} className="flex flex-col gap-2">
        <div data-poster className="relative">
          <Poster path={item.title.posterPath} title={item.title.title} size="w342" seed={`${item.title.tmdbType}:${item.title.id}`} priority={priority} />
          {streaming ? (
            <span className="font-micro absolute inset-x-0 bottom-0 truncate bg-brand px-1.5 py-1 text-center text-[0.625rem] text-on-brand">
              No seu {streaming.name}
            </span>
          ) : null}
        </div>
        <span className="font-display line-clamp-2 text-[0.9375rem] leading-[1.14]">{item.title.title}</span>
        <span className="font-micro -mt-1 text-[0.625rem] text-soft">{creditLine(item.title)}</span>
      </Link>
      <AddedBy people={item.addedBy} />
      <Button size="sm" variant="secondary" onClick={onWatched} className="mt-auto px-2">
        Assistimos!
      </Button>
    </div>
  );
}

/** A folha de registro só é baixada quando alguém toca em "Assistimos!". */
const LogSheet = dynamic(() => import("./log-sheet").then((module) => module.LogSheet));

/** Busca o título completo e abre a folha de registro; ao salvar, ele sai do quero ver. */
function AssistimosLauncher({ titleId, onDone }: { titleId: string; onDone: () => void }) {
  const title = useTitle(titleId);
  const [open, setOpen] = useState(true);
  if (!title.data) return null;
  return (
    <LogSheet
      title={title.data}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) onDone();
      }}
    />
  );
}
