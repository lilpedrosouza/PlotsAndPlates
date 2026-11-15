/** Constantes de Plates, sem zod: podem ir no JavaScript da primeira carga. */

export const DISH_CATEGORIES = ["entrada", "principal", "sobremesa", "bebida"] as const;
export type DishCategory = (typeof DISH_CATEGORIES)[number];
export const DISH_CATEGORY_LABELS: Record<DishCategory, string> = {
  entrada: "Entrada",
  principal: "Principal",
  sobremesa: "Sobremesa",
  bebida: "Bebida",
};

export const PRICE_LEVELS = [1, 2, 3, 4] as const;
export type PriceLevel = (typeof PRICE_LEVELS)[number];

export const WISHLIST_PRIORITIES = ["alta", "media", "baixa"] as const;
export type WishlistPriority = (typeof WISHLIST_PRIORITIES)[number];
export const WISHLIST_PRIORITY_LABELS: Record<WishlistPriority, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export const RESTAURANT_SORTS = ["recentes", "nota", "nome", "prioridade"] as const;
export type RestaurantSort = (typeof RESTAURANT_SORTS)[number];

export const RESTAURANT_STATUSES = ["fomos", "quero-ir", "todos"] as const;
export type RestaurantStatus = (typeof RESTAURANT_STATUSES)[number];

/** Data de hoje (AAAA-MM-DD) no fuso de quem está rodando o código. */
export function todayIso(now = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}
