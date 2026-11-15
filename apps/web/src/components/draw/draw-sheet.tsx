"use client";

import { type DrawFilters, type DrawItem, TITLE_KINDS, TITLE_KIND_LABELS, type TitleKind, cuisineLabel, filterPool, nextPick } from "@pap/shared";
import { Dices } from "lucide-react";
import { useReducedMotion } from "motion/react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { Sheet } from "@/components/plates/sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChipToggle } from "@/components/ui/chip";
import { Skeleton } from "@/components/ui/skeleton";
import { usePartner } from "@/lib/couple/queries";
import { priceLabel } from "@/lib/plates/format";
import { Deck, type DeckPhase } from "./deck";

export type DrawCard = { item: DrawItem; href: string; face: ReactNode; action: ReactNode };

type DrawSheetProps = {
  world: "plates" | "plots";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: DrawCard[];
  loading: boolean;
};

const unique = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b, "pt-BR"));

/** "O que a gente faz hoje?": filtros, o baralho e o sorteado. */
export function DrawSheet({ world, open, onOpenChange, cards, loading }: DrawSheetProps) {
  const partner = usePartner();
  const reduced = useReducedMotion();
  const [filters, setFilters] = useState<DrawFilters>({});
  const [phase, setPhase] = useState<DeckPhase>("idle");
  const [picked, setPicked] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [round, setRound] = useState(0);

  const pool = filterPool(
    cards.map((card) => card.item),
    filters,
  );
  const chosen = cards.find((card) => card.item.id === picked) ?? null;
  const cuisines = unique(cards.flatMap((card) => card.item.cuisines ?? []));

  const setFilter = (patch: Partial<DrawFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPhase("idle");
    setPicked(null);
  };

  const draw = () => {
    if (pool.length === 0) return;
    const next = nextPick(
      pool.map((item) => item.id),
      recent,
      Math.random,
    );
    setRecent(next.recent);
    setPicked(next.id);
    setRound((value) => value + 1);
    // Um item só, ou movimento reduzido: revela direto.
    setPhase(reduced || pool.length === 1 ? "revealed" : "shuffling");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="O que a gente faz hoje?" description={world === "plates" ? "Sorteio no quero ir" : "Sorteio no quero ver"}>
      <div className="flex flex-col gap-6">
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtros do sorteio">
          {partner ? (
            <ChipToggle pressed={Boolean(filters.onlyBoth)} onPressedChange={(on) => setFilter({ onlyBoth: on || undefined })}>
              Os dois querem
            </ChipToggle>
          ) : null}
          {world === "plates" ? (
            <>
              {[1, 2, 3].map((level) => (
                <ChipToggle key={level} pressed={filters.maxPrice === level} onPressedChange={(on) => setFilter({ maxPrice: on ? level : undefined })}>
                  Até {priceLabel(level)}
                </ChipToggle>
              ))}
              {cuisines.map((cuisine) => (
                <ChipToggle key={cuisine} pressed={filters.cuisine === cuisine} onPressedChange={(on) => setFilter({ cuisine: on ? cuisine : undefined })}>
                  {cuisineLabel(cuisine)}
                </ChipToggle>
              ))}
            </>
          ) : (
            <>
              <ChipToggle pressed={Boolean(filters.onlyMyStreamings)} onPressedChange={(on) => setFilter({ onlyMyStreamings: on || undefined })}>
                Nos meus streamings
              </ChipToggle>
              {([90, 120] as const).map((minutes) => (
                <ChipToggle key={minutes} pressed={filters.maxMinutes === minutes} onPressedChange={(on) => setFilter({ maxMinutes: on ? minutes : undefined })}>
                  {minutes === 90 ? "Até 1h30" : "Até 2h"}
                </ChipToggle>
              ))}
              {TITLE_KINDS.map((kind: TitleKind) => (
                <ChipToggle
                  key={kind}
                  pressed={Boolean(filters.kinds?.includes(kind))}
                  onPressedChange={(on) =>
                    setFilter({ kinds: on ? [...(filters.kinds ?? []), kind] : (filters.kinds ?? []).filter((value) => value !== kind) })
                  }
                >
                  {TITLE_KIND_LABELS[kind]}
                </ChipToggle>
              ))}
            </>
          )}
        </div>

        {loading ? (
          <Skeleton className="mx-auto aspect-[2/3] w-[min(15rem,62vw)]" />
        ) : pool.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="font-display text-[1.375rem] leading-tight">{cards.length === 0 ? "A lista está vazia" : "Nada com esses filtros"}</p>
            {cards.length > 0 ? (
              <Button variant="secondary" size="sm" onClick={() => setFilter({ onlyBoth: undefined, maxPrice: undefined, cuisine: undefined, onlyMyStreamings: undefined, maxMinutes: undefined, kinds: undefined })}>
                Limpar filtros
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <p aria-live="polite" className="font-micro text-[0.75rem] text-soft">
              {phase === "revealed" && chosen ? "Saiu!" : pool.length === 1 ? "1 opção" : `${pool.length} opções no baralho`}
            </p>
            <Deck phase={phase} count={pool.length} front={chosen?.face ?? null} round={round} onShuffled={() => setPhase("revealed")} />
            {phase === "revealed" && chosen ? (
              <div className="flex w-full flex-col gap-2">
                <Link href={chosen.href} className={buttonVariants({ block: true })} onClick={() => onOpenChange(false)}>
                  Bora!
                </Link>
                <div className="grid grid-cols-2 gap-2">
                  {chosen.action}
                  <Button variant="secondary" onClick={draw} disabled={pool.length < 2}>
                    Sortear de novo
                  </Button>
                </div>
              </div>
            ) : (
              <Button block onClick={draw} busy={phase === "shuffling"}>
                <Dices aria-hidden />
                Sortear
              </Button>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
