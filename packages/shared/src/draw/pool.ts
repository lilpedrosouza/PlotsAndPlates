import type { TitleKind } from "../plots";

/** Um item das listas de vontade, com o que os filtros do sorteio precisam. */
export type DrawItem = {
  id: string;
  addedByBoth: boolean;
  cuisines?: string[];
  priceLevel?: number | null;
  titleKind?: TitleKind;
  /** Minutos (série: duração do episódio). */
  runtime?: number | null;
  onMyStreamings?: boolean;
};

export type DrawFilters = {
  cuisine?: string;
  maxPrice?: number;
  kinds?: TitleKind[];
  maxMinutes?: 90 | 120;
  onlyMyStreamings?: boolean;
  onlyBoth?: boolean;
};

export function filterPool(items: readonly DrawItem[], filters: DrawFilters): DrawItem[] {
  return items.filter((item) => {
    if (filters.onlyBoth && !item.addedByBoth) return false;
    if (filters.cuisine && !(item.cuisines ?? []).includes(filters.cuisine)) return false;
    if (filters.maxPrice !== undefined && (item.priceLevel == null || item.priceLevel > filters.maxPrice)) return false;
    if (filters.kinds && filters.kinds.length > 0 && (!item.titleKind || !filters.kinds.includes(item.titleKind))) return false;
    if (filters.maxMinutes !== undefined && (item.runtime == null || item.runtime > filters.maxMinutes)) return false;
    if (filters.onlyMyStreamings && !item.onMyStreamings) return false;
    return true;
  });
}

/**
 * Sorteia entre os que ainda não saíram. Quando todos já saíram, recomeça
 * sem repetir o último sorteado.
 */
export function nextPick(poolIds: readonly string[], recent: readonly string[], random: () => number): { id: string; recent: string[] } {
  if (poolIds.length === 0) throw new Error("Nada para sortear.");
  if (poolIds.length === 1) return { id: poolIds[0]!, recent: [poolIds[0]!] };
  let history = recent.filter((id) => poolIds.includes(id));
  let available = poolIds.filter((id) => !history.includes(id));
  if (available.length === 0) {
    const last = history.at(-1);
    available = poolIds.filter((id) => id !== last);
    history = [];
  }
  const index = Math.min(available.length - 1, Math.floor(random() * available.length));
  const id = available[index]!;
  return { id, recent: [...history, id] };
}
