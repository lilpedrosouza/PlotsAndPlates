"use client";

import { Dices } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { AddedBy } from "@/components/couple/added-by";
import { ArchPhoto } from "@/components/plates/arch-photo";
import { FomosButton } from "@/components/plates/fomos-button";
import { Poster } from "@/components/plots/poster";
import { Button } from "@/components/ui/button";
import { fromWatchlist, fromWishlist, useWholeWishlist } from "@/lib/draw/items";
import { placeLine } from "@/lib/plates/format";
import { creditLine } from "@/lib/plots/format";
import { useWatchlist } from "@/lib/plots/queries";


/** O baralho só é baixado quando alguém pede um sorteio. */
const DrawSheet = dynamic(() => import("./draw-sheet").then((module) => module.DrawSheet));

function DrawTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="secondary" size="sm" onClick={onClick}>
      <Dices aria-hidden />O que a gente faz hoje?
    </Button>
  );
}

/** Sorteio no quero ir: o baralho é de rótulos. */
export function PlatesDraw() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  const list = useWholeWishlist(open);
  const cards = (list.data ?? []).map((restaurant) => ({
    item: fromWishlist(restaurant),
    href: `/plates/r/${restaurant.id}`,
    face: (
      <div className="frame-label flex h-full flex-col bg-surface p-2.5 text-left">
        <ArchPhoto src={restaurant.coverThumbUrl} alt={`Foto de ${restaurant.name}`} sizes="15rem" className="min-h-0 flex-1" />
        <div className="rule-double mt-2.5 pt-2">
          <p className="font-display text-[1.25rem] leading-[1.1] [overflow-wrap:anywhere]">{restaurant.name}</p>
          {placeLine(restaurant) ? <p className="font-micro mt-1 text-[0.6875rem] text-soft">{placeLine(restaurant)}</p> : null}
          {restaurant.wishlist ? <AddedBy people={restaurant.wishlist.addedBy} className="mt-1.5" /> : null}
        </div>
      </div>
    ),
    action: <FomosButton restaurantId={restaurant.id} block />,
  }));
  return (
    <>
      <DrawTrigger
        onClick={() => {
          setKey((value) => value + 1);
          setOpen(true);
        }}
      />
      {key > 0 ? <DrawSheet key={key} world="plates" open={open} onOpenChange={setOpen} cards={cards} loading={list.isPending} /> : null}
    </>
  );
}

/** Sorteio no quero ver: o baralho é de pôsteres. "Assistimos!" abre a folha de registro. */
export function PlotsDraw({ onWatched }: { onWatched: (titleId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  const list = useWatchlist({ sort: "recentes" });
  const cards = (list.data ?? []).map((entry) => ({
    item: fromWatchlist(entry),
    href: `/plots/t/${entry.title.id}`,
    face: (
      <div className="flex h-full flex-col border border-rule-strong bg-surface">
        <div className="min-h-0 flex-1 overflow-hidden">
          <Poster path={entry.title.posterPath} title={entry.title.title} size="w342" seed={`${entry.title.tmdbType}:${entry.title.id}`} />
        </div>
        <div className="border-t border-rule px-2.5 py-2">
          <p className="font-display truncate text-[1rem] leading-tight text-brand">{entry.title.title}</p>
          <p className="font-micro mt-0.5 truncate text-[0.625rem] text-soft">{creditLine(entry.title)}</p>
        </div>
      </div>
    ),
    action: (
      <Button
        variant="secondary"
        onClick={() => {
          setOpen(false);
          onWatched(entry.title.id);
        }}
      >
        Assistimos!
      </Button>
    ),
  }));
  return (
    <>
      <DrawTrigger
        onClick={() => {
          setKey((value) => value + 1);
          setOpen(true);
        }}
      />
      {key > 0 ? <DrawSheet key={key} world="plots" open={open} onOpenChange={setOpen} cards={cards} loading={list.isPending} /> : null}
    </>
  );
}
