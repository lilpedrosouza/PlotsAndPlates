"use client";

import type { DrawItem, Page, RestaurantSummary, WatchlistItem } from "@pap/shared";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { useAuth } from "../auth";
import { platesKeys } from "../plates/keys";

/** O quero ir inteiro (o sorteio usa a lista toda, não só a página carregada). */
export function useWholeWishlist(enabled: boolean) {
  const auth = useAuth();
  return useQuery({
    queryKey: [...platesKeys.lists(), "sorteio"],
    queryFn: async () => {
      const all: RestaurantSummary[] = [];
      let cursor: string | undefined;
      do {
        const params = new URLSearchParams({ status: "quero-ir", limit: "60" });
        if (cursor) params.set("cursor", cursor);
        const page = await api<Page<RestaurantSummary>>(`/restaurants?${params}`);
        all.push(...page.items);
        cursor = page.nextCursor ?? undefined;
      } while (cursor);
      return all;
    },
    enabled: enabled && auth.status === "in",
  });
}

export function fromWishlist(restaurant: RestaurantSummary): DrawItem {
  return {
    id: restaurant.id,
    addedByBoth: (restaurant.wishlist?.addedBy.length ?? 0) >= 2,
    cuisines: restaurant.cuisines,
    priceLevel: restaurant.priceLevel,
  };
}

export function fromWatchlist(item: WatchlistItem): DrawItem {
  return {
    id: item.title.id,
    addedByBoth: item.addedBy.length >= 2,
    titleKind: item.title.kind,
    runtime: item.title.runtime,
    onMyStreamings: item.onMyStreamings.length > 0,
  };
}
