"use client";

import { type RestaurantSummary, WISHLIST_PRIORITY_LABELS } from "@pap/shared";
import Link from "next/link";
import type { MouseEvent } from "react";
import { AddedBy } from "@/components/couple/added-by";
import { Stamp } from "@/components/ui/stamp";
import { placeLine, shortDate, tiltFor, visitsLabel } from "@/lib/plates/format";
import { useTransitionNavigate } from "@/lib/transition-router";
import { cn } from "@/lib/utils";
import { ArchPhoto } from "./arch-photo";
import { FomosButton } from "./fomos-button";

/** Nome da View Transition do arco que viaja do rótulo até a página do restaurante. */
export const HERO_TRANSITION = "plates-hero";

/**
 * Abre a página do restaurante fazendo o arco do rótulo viajar até o topo da
 * página nova (transição de elemento compartilhado).
 */
export function useOpenRestaurant() {
  const navigate = useTransitionNavigate();
  return (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    const hero = event.currentTarget.querySelector<HTMLElement>("[data-hero]");
    if (hero) hero.style.viewTransitionName = HERO_TRANSITION;
    navigate(href, { types: ["to-detail"] });
  };
}

/** Rótulo de um restaurante no caderno: arco, fio duplo, nome, lugar e carimbo. */
export function RestaurantCard({ restaurant, priority }: { restaurant: RestaurantSummary; priority?: boolean }) {
  const open = useOpenRestaurant();
  const href = `/plates/r/${restaurant.id}`;
  const wish = restaurant.wishlist;

  return (
    <article className="frame-label flex h-full flex-col bg-surface p-3">
      <Link
        href={href}
        onClick={(event) => open(event, href)}
        className="group block rounded-sm outline-offset-4"
      >
        <div data-hero>
          <ArchPhoto
            src={restaurant.coverThumbUrl}
            alt={`Foto de ${restaurant.name}`}
            sizes="(min-width: 768px) 20rem, 46vw"
            priority={priority}
            className="transition-[filter] duration-base group-hover:brightness-[1.03]"
          />
        </div>
        <div className="rule-double mt-3 pt-2.5">
          <h3 className="font-display text-[1.125rem] leading-[1.15] [overflow-wrap:anywhere] sm:text-[1.25rem]">
            {restaurant.name}
          </h3>
          {placeLine(restaurant) ? (
            <p className="font-micro mt-1.5 text-[0.6875rem] leading-snug text-soft">{placeLine(restaurant)}</p>
          ) : null}
        </div>
      </Link>

      {wish ? (
        <div className="mt-2.5 flex flex-1 flex-col justify-end gap-2.5">
          {wish.reason ? <p className="line-clamp-3 font-display text-[0.9375rem] italic leading-snug text-soft">“{wish.reason}”</p> : null}
          <p className={cn("font-micro text-[0.6875rem]", wish.priority === "alta" ? "text-brand" : "text-soft")}>
            Prioridade {WISHLIST_PRIORITY_LABELS[wish.priority].toLowerCase()}
          </p>
          <AddedBy people={wish.addedBy} />
          <FomosButton restaurantId={restaurant.id} size="sm" block />
        </div>
      ) : (
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <p className="font-micro pb-1 text-[0.6875rem] leading-tight text-soft">
            {visitsLabel(restaurant.visitCount)}
            {restaurant.lastVisitOn ? (
              <>
                <br />
                {shortDate(restaurant.lastVisitOn)}
              </>
            ) : null}
          </p>
          <Stamp value={restaurant.myOverall} caption="você" size="sm" tilt={tiltFor(restaurant.id)} />
        </div>
      )}
    </article>
  );
}
