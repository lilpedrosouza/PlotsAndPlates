/** Minutos de uma sessão: filme pela duração; temporada, episódios × duração do episódio. Sem dado, 0. */
export function sessionMinutes(log: { tmdbType: "movie" | "tv"; runtime: number | null; episodeCount: number | null }): number {
  if (log.runtime === null) return 0;
  if (log.tmdbType === "movie") return log.runtime;
  return log.episodeCount === null ? 0 : log.episodeCount * log.runtime;
}

/** O mais frequente. Empate: maior `tiebreak`, depois ordem alfabética. */
export function topBy<T>(items: readonly T[], keyOf: (item: T) => string, tiebreak?: (key: string) => number): { key: string; count: number } | null {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = keyOf(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best: { key: string; count: number } | null = null;
  for (const [key, count] of counts) {
    if (!best || count > best.count) {
      best = { key, count };
      continue;
    }
    if (count < best.count) continue;
    const a = tiebreak?.(key) ?? 0;
    const b = tiebreak?.(best.key) ?? 0;
    if (a > b || (a === b && key.localeCompare(best.key, "pt-BR") < 0)) best = { key, count };
  }
  return best;
}

/** Notas dos dois: quantas iguais, a mais próxima e a mais distante (só se houver diferença). */
export function closestAndFarthest<T extends { mine: number; partner: number }>(pairs: readonly T[]): { equal: number; agreed: T | null; disagreed: T | null } {
  let equal = 0;
  let agreed: T | null = null;
  let disagreed: T | null = null;
  const gap = (pair: T) => Math.abs(pair.mine - pair.partner);
  for (const pair of pairs) {
    if (gap(pair) === 0) equal += 1;
    if (!agreed || gap(pair) < gap(agreed)) agreed = pair;
    if (gap(pair) > 0 && (!disagreed || gap(pair) > gap(disagreed))) disagreed = pair;
  }
  return { equal, agreed, disagreed };
}
