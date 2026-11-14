"use client";

import { type RestaurantSummary, WISHLIST_PRIORITY_LABELS, formatRating } from "@pap/shared";
import Link from "next/link";
import { placeLine, visitsLabel } from "@/lib/plates/format";
import { cn } from "@/lib/utils";
import { useOpenRestaurant } from "./restaurant-card";

/**
 * Uma linha do índice do caderno, como num caderno de receitas: o nome, o
 * pontilhado e a nota na margem; embaixo, a letra miúda.
 */
export function RestaurantRow({ restaurant }: { restaurant: RestaurantSummary }) {
  const open = useOpenRestaurant();
  const href = `/plates/r/${restaurant.id}`;
  const wish = restaurant.wishlist;
  const detail = [placeLine(restaurant), wish ? `prioridade ${WISHLIST_PRIORITY_LABELS[wish.priority].toLowerCase()}` : visitsLabel(restaurant.visitCount)]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={href}
      onClick={(event) => open(event, href)}
      className="group block border-b border-rule py-3.5 outline-offset-2 transition-colors duration-fast hover:bg-sunken/60"
    >
      <span className="flex items-baseline gap-2">
        <span className="font-display min-w-0 truncate text-[1.1875rem] leading-tight">{restaurant.name}</span>
        <span aria-hidden className="mb-[0.3em] min-w-6 flex-1 border-b-2 border-dotted border-rule-strong" />
        <span
          className={cn(
            "font-display shrink-0 text-[1.1875rem] leading-tight tabular-nums",
            restaurant.myOverall === null ? "text-soft" : "text-brand",
          )}
        >
          {restaurant.myOverall === null ? (wish ? "quero ir" : "–") : formatRating(restaurant.myOverall)}
        </span>
      </span>
      {detail ? <span className="font-micro mt-1 block text-[0.6875rem] text-soft">{detail}</span> : null}
    </Link>
  );
}
