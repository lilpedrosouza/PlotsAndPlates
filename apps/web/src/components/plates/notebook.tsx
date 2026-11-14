"use client";

import type { RestaurantSummary } from "@pap/shared";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { LayoutGrid, List, SlidersHorizontal } from "lucide-react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PlateArt } from "@/components/art/plate-art";
import { useSection } from "@/components/shell/section-context";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SPRING } from "@/lib/motion";
import {
  DEFAULT_FILTERS,
  type NotebookFilters,
  activeFilterCount,
  filtersFromSearchParams,
  filtersToSearchParams,
  toListQuery,
} from "@/lib/plates/filters";
import { useRestaurants } from "@/lib/plates/queries";
import { cn } from "@/lib/utils";
import { ActiveFilters, FiltersSheet } from "./filters-sheet";
import { RestaurantCard } from "./restaurant-card";
import { RestaurantRow } from "./restaurant-row";

type Status = "fomos" | "quero-ir";
type View = "grade" | "indice";

/** A partir daqui o índice passa a desenhar só as linhas visíveis. */
const VIRTUALIZE_FROM = 40;

const COPY: Record<Status, { title: string; empty: string; emptyHint: string }> = {
  fomos: {
    title: "O que a gente já provou",
    empty: "O caderno ainda está em branco",
    emptyHint: "Cada restaurante que vocês visitarem vira um rótulo aqui, com a foto, os pratos e a nota de cada um.",
  },
  "quero-ir": {
    title: "Pra onde a gente quer ir",
    empty: "Nenhum lugar na lista ainda",
    emptyHint: "Guarde aqui os restaurantes que alguém indicou ou que vocês viram passando. Quando forem, é só tocar em “Fomos!”.",
  },
};

export function Notebook({ status }: { status: Status }) {
  const section = useSection();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const defaults: NotebookFilters = { status, sort: status === "quero-ir" ? "prioridade" : DEFAULT_FILTERS.sort };
  const filters = filtersFromSearchParams(new URLSearchParams(searchParams.toString()), defaults);
  const view: View = searchParams.get("ver") === "indice" ? "indice" : "grade";
  const [filtersOpen, setFiltersOpen] = useState(false);
  // A folha monta de novo a cada abertura, com os filtros atuais da URL.
  const [filtersKey, setFiltersKey] = useState(0);

  const query = useRestaurants(toListQuery({ ...filters, status }));
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const copy = COPY[status];
  const filtered = activeFilterCount(filters) > 0;

  const update = (next: NotebookFilters, nextView: View = view) => {
    const params = filtersToSearchParams({ ...next, status }, defaults);
    if (nextView === "indice") params.set("ver", "indice");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const keepParams = (target: Status) => {
    const params = new URLSearchParams();
    if (view === "indice") params.set("ver", "indice");
    const qs = params.toString();
    const base = target === "fomos" ? "/plates" : "/plates/quero-ir";
    return qs ? `${base}?${qs}` : base;
  };

  // Rolagem infinita: busca a próxima página quando o fim da lista aparece.
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    const element = sentinel.current;
    if (!element || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: "600px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    // O fim da página fica livre do carimbo "Novo", que flutua sobre a barra.
    <div className="flex flex-col gap-6 pt-2 pb-20 md:pb-8">
      <nav aria-label="Situação" className="flex gap-6 border-b border-rule">
        {(["fomos", "quero-ir"] as const).map((target) => (
          <Link
            key={target}
            href={keepParams(target)}
            aria-current={status === target ? "page" : undefined}
            className={cn(
              "font-micro -mb-px border-b-2 pb-2.5 text-[1rem] transition-colors duration-fast",
              status === target ? "border-brand text-foreground" : "border-transparent text-soft hover:text-foreground",
            )}
          >
            {target === "fomos" ? "Fomos" : "Quero ir"}
          </Link>
        ))}
      </nav>

      <header className="flex flex-col gap-4">
        <h1 className="font-display text-[clamp(2rem,8vw,3rem)] leading-[1.05]">{copy.title}</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setFiltersKey((key) => key + 1);
              setFiltersOpen(true);
            }}
          >
            <SlidersHorizontal aria-hidden />
            Filtros{filtered ? ` (${activeFilterCount(filters)})` : ""}
          </Button>
          <div role="group" aria-label="Como mostrar" className="ml-auto flex rounded-md border border-rule-strong p-0.5">
            {(
              [
                ["grade", "Grade de rótulos", LayoutGrid],
                ["indice", "Índice", List],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                aria-pressed={view === value}
                aria-label={label}
                onClick={() => update(filters, value)}
                className={cn(
                  "inline-flex size-10 items-center justify-center rounded-sm transition-colors duration-fast",
                  view === value ? "bg-foreground text-background" : "text-soft hover:bg-sunken hover:text-foreground",
                )}
              >
                <Icon aria-hidden className="size-[1.15rem]" />
              </button>
            ))}
          </div>
        </div>
        <ActiveFilters filters={filters} onChange={(next) => update(next)} />
      </header>

      {query.isPending ? (
        <NotebookSkeleton view={view} />
      ) : query.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-soft">{query.error instanceof Error ? query.error.message : "Não deu para abrir o caderno."}</p>
          <Button variant="secondary" onClick={() => void query.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : items.length === 0 ? (
        <EmptyNotebook copy={copy} filtered={filtered} onClear={() => update({ status, sort: filters.sort })} />
      ) : view === "grade" ? (
        <ul
          className={cn(
            "grid grid-cols-2 gap-x-4 gap-y-7 pb-6 md:grid-cols-3 md:gap-x-6",
            // Prateleira: a coluna do meio/direita desce um pouco, como potes desalinhados.
            "[&>li:nth-child(2n)]:translate-y-6 md:[&>li:nth-child(2n)]:translate-y-0 md:[&>li:nth-child(3n+2)]:translate-y-6",
            query.isPlaceholderData && "opacity-60 transition-opacity duration-base",
          )}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {items.map((restaurant, index) => (
              <m.li
                key={restaurant.id}
                layout="position"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={SPRING[section].settle}
              >
                <RestaurantCard restaurant={restaurant} priority={index < 2} />
              </m.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <RestaurantIndex items={items} dimmed={query.isPlaceholderData} />
      )}

      <div ref={sentinel} aria-hidden />
      {isFetchingNextPage ? <p className="font-micro text-center text-[0.75rem] text-soft">Carregando mais…</p> : null}

      <FiltersSheet
        key={filtersKey}
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={{ ...filters, status }}
        onApply={(next) => update(next)}
      />
    </div>
  );
}

function RestaurantIndex({ items, dimmed }: { items: RestaurantSummary[]; dimmed: boolean }) {
  const section = useSection();
  if (items.length >= VIRTUALIZE_FROM) return <VirtualIndex items={items} />;
  return (
    <ul className={cn("border-t border-rule-strong", dimmed && "opacity-60")}>
      <AnimatePresence initial={false}>
        {items.map((restaurant) => (
          <m.li
            key={restaurant.id}
            layout="position"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={SPRING[section].settle}
          >
            <RestaurantRow restaurant={restaurant} />
          </m.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

/** Índice longo: só as linhas visíveis ficam no DOM. */
function VirtualIndex({ items }: { items: RestaurantSummary[] }) {
  const list = useRef<HTMLUListElement>(null);
  const [offset, setOffset] = useState(0);
  useEffect(() => setOffset(list.current?.offsetTop ?? 0), []);
  const virtualizer = useWindowVirtualizer({
    count: items.length,
    estimateSize: () => 76,
    overscan: 8,
    scrollMargin: offset,
  });

  return (
    <ul ref={list} className="relative border-t border-rule-strong" style={{ height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map((row) => {
        const restaurant = items[row.index];
        if (!restaurant) return null;
        return (
          <li
            key={restaurant.id}
            data-index={row.index}
            ref={virtualizer.measureElement}
            className="absolute inset-x-0 top-0"
            style={{ transform: `translateY(${row.start - virtualizer.options.scrollMargin}px)` }}
          >
            <RestaurantRow restaurant={restaurant} />
          </li>
        );
      })}
    </ul>
  );
}

function EmptyNotebook({ copy, filtered, onClear }: { copy: (typeof COPY)[Status]; filtered: boolean; onClear: () => void }) {
  if (filtered) {
    return (
      <div className="flex flex-col items-start gap-4 border-t border-rule-strong pt-6">
        <h2 className="font-display text-2xl leading-tight">Nada com esses filtros</h2>
        <p className="max-w-[44ch] text-soft">Tira um filtro ou outro para ver mais restaurantes.</p>
        <Button variant="secondary" onClick={onClear}>
          Limpar filtros
        </Button>
      </div>
    );
  }
  return (
    <section className="grid gap-7 sm:grid-cols-[minmax(0,15rem)_1fr] sm:items-center">
      <div className="frame-label ml-1 max-w-[15rem] bg-surface p-3.5">
        <PlateArt variant="vazio" className="arch aspect-[4/5] w-full" />
        <div className="rule-double mt-4 flex flex-col gap-2 pt-3">
          <span className="h-5 w-3/4 rounded-xs border border-dashed border-rule-strong" />
          <span className="h-3.5 w-1/2 rounded-xs border border-dashed border-rule-strong" />
        </div>
      </div>
      <div className="flex flex-col items-start gap-4">
        <h2 className="font-display text-2xl leading-tight">{copy.empty}</h2>
        <p className="max-w-[44ch] leading-relaxed text-soft">{copy.emptyHint}</p>
        <Link href="/plates/novo" className={buttonVariants()}>
          Cadastrar restaurante
        </Link>
      </div>
    </section>
  );
}

export function NotebookSkeleton({ view = "grade" }: { view?: View }) {
  if (view === "indice") {
    return (
      <div aria-busy className="flex flex-col gap-3 border-t border-rule-strong pt-3">
        {[0, 1, 2, 3, 4].map((index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    );
  }
  return (
    <div aria-busy className="grid grid-cols-2 gap-x-4 gap-y-7 md:grid-cols-3 md:gap-x-6">
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className={cn("frame-label bg-surface p-3", index % 2 === 1 && "translate-y-6 md:translate-y-0")}>
          <Skeleton className="arch aspect-[4/5] w-full" />
          <Skeleton className="mt-3 h-5 w-3/4" />
          <Skeleton className="mt-2 h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}
