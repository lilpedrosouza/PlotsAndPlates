import type { DishWithScore } from "./types";

/**
 * Ranking dos pratos de um restaurante: maior nota primeiro, pratos sem nota no
 * fim; no empate, quem tem mais notas, depois o nome. Não altera a lista.
 */
export function rankDishes<T extends DishWithScore>(dishes: readonly T[]): T[] {
  return [...dishes].sort((a, b) => {
    if (a.score === null && b.score !== null) return 1;
    if (b.score === null && a.score !== null) return -1;
    if (a.score !== null && b.score !== null && a.score !== b.score) return b.score - a.score;
    if (a.ratingCount !== b.ratingCount) return b.ratingCount - a.ratingCount;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

/** Caminho da miniatura de uma foto: `x.webp` → `x.thumb.webp`. */
export function thumbPathOf(path: string): string {
  return path.replace(/\.webp$/, ".thumb.webp");
}
