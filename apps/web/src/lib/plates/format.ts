import { type RestaurantSummary, cuisineLabel } from "@pap/shared";

/** "$$" para a faixa de preço 2. */
export const priceLabel = (level: number | null | undefined) => (level ? "$".repeat(level) : "");

/** Número de catálogo com quatro algarismos: 12 → "0012". */
export const catalog = (value: number) => String(value).padStart(4, "0");

const DAY = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" });
const FULL = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** "12 de nov." a partir de "2026-11-12" (datas de visita não têm fuso). */
export const shortDate = (iso: string) => DAY.format(new Date(`${iso}T12:00:00Z`)).replace(".", "");
export const longDate = (iso: string) => FULL.format(new Date(`${iso}T12:00:00Z`));

const MONEY = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const money = (cents: number | null | undefined) => (cents == null ? "" : MONEY.format(cents / 100));

/** Linha de letra miúda do rótulo: lugar · cozinha · preço. */
export function placeLine(restaurant: Pick<RestaurantSummary, "neighborhood" | "city" | "cuisines" | "priceLevel">) {
  return [restaurant.neighborhood || restaurant.city, restaurant.cuisines[0] ? cuisineLabel(restaurant.cuisines[0]) : "", priceLabel(restaurant.priceLevel)]
    .filter(Boolean)
    .join(" · ");
}

/** Giro do carimbo, estável por restaurante, entre −8° e −3°. */
export function tiltFor(id: string): number {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return -3 - (Math.abs(hash) % 6);
}

/** "1 visita", "3 visitas". */
export const visitsLabel = (count: number) => (count === 1 ? "1 visita" : `${count} visitas`);
