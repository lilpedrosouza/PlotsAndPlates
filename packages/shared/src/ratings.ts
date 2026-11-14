/**
 * Regras de nota do PAP.
 *
 * - Toda nota dada por um usuário vai de 0,5 a 5, em passos de meia estrela.
 * - A nota geral de um restaurante é a média dos critérios, arredondada para
 *   a meia estrela mais próxima (empate arredonda para cima: 3,25 → 3,5).
 * - Médias de casal e de comunidade são sempre calculadas, nunca armazenadas,
 *   e não são arredondadas para meia estrela (4 e 4,5 → 4,25).
 */

export const RATING_MIN = 0.5;
export const RATING_MAX = 5;
export const RATING_STEP = 0.5;

/** Todas as notas possíveis, da menor para a maior. */
export const RATING_VALUES = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const;
export type Rating = (typeof RATING_VALUES)[number];

export const RESTAURANT_CRITERIA = ["food", "service", "ambiance", "value"] as const;
export type RestaurantCriterion = (typeof RESTAURANT_CRITERIA)[number];

export const RESTAURANT_CRITERIA_LABELS: Record<RestaurantCriterion, string> = {
  food: "Comida",
  service: "Atendimento",
  ambiance: "Ambiente",
  value: "Custo-benefício",
};

export type CriteriaRatings = Partial<Record<RestaurantCriterion, number | null | undefined>>;

/** `true` se o valor é uma nota válida: múltiplo de 0,5 entre 0,5 e 5. */
export function isValidRating(value: unknown): value is Rating {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= RATING_MIN &&
    value <= RATING_MAX &&
    Number.isInteger(value / RATING_STEP)
  );
}

/**
 * Arredonda para a meia estrela mais próxima, limitando ao intervalo 0,5–5.
 * Empates (x,25 e x,75) arredondam para cima.
 */
export function roundToHalf(value: number): Rating {
  if (!Number.isFinite(value)) {
    throw new RangeError("A nota precisa ser um número finito.");
  }
  const rounded = Math.round(value / RATING_STEP) * RATING_STEP;
  return Math.min(RATING_MAX, Math.max(RATING_MIN, rounded)) as Rating;
}

/** Média aritmética ignorando valores vazios. `null` quando não há nenhuma nota. */
export function mean(values: ReadonlyArray<number | null | undefined>): number | null {
  let sum = 0;
  let count = 0;
  for (const value of values) {
    if (value === null || value === undefined) continue;
    sum += value;
    count += 1;
  }
  return count === 0 ? null : sum / count;
}

/**
 * Nota geral do restaurante: média dos critérios preenchidos, arredondada para
 * meia estrela. `null` quando nenhum critério foi avaliado.
 */
export function overallFromCriteria(criteria: CriteriaRatings): Rating | null {
  const average = mean(RESTAURANT_CRITERIA.map((key) => criteria[key]));
  return average === null ? null : roundToHalf(average);
}

/**
 * Sugestão de nota para a série inteira a partir das temporadas avaliadas.
 * É só uma sugestão: a nota da série é sempre dada pelo usuário.
 */
export function suggestSeriesRating(seasonRatings: ReadonlyArray<number | null | undefined>): Rating | null {
  const average = mean(seasonRatings);
  return average === null ? null : roundToHalf(average);
}

export type CoupleRating = {
  /** Nota de quem está vendo. */
  mine: number | null;
  /** Nota do par. */
  partner: number | null;
  /** Média das notas existentes; com uma nota só, é ela mesma. */
  average: number | null;
  /** Diferença absoluta entre as duas notas; `null` se faltar alguma. */
  difference: number | null;
};

/** Notas lado a lado + média do casal. */
export function coupleRating(mine: number | null | undefined, partner: number | null | undefined): CoupleRating {
  const a = mine ?? null;
  const b = partner ?? null;
  return {
    mine: a,
    partner: b,
    average: mean([a, b]),
    difference: a !== null && b !== null ? Math.abs(a - b) : null,
  };
}

export type CommunityRating = {
  average: number | null;
  count: number;
};

/** Média da comunidade PAP (os chamadores já devem ter filtrado o que é visível). */
export function communityRating(ratings: ReadonlyArray<number | null | undefined>): CommunityRating {
  const present = ratings.filter((value): value is number => value !== null && value !== undefined);
  return { average: mean(present), count: present.length };
}

/**
 * Formata uma nota ou média em pt-BR: "4", "4,5", "4,25".
 * Notas individuais nunca passam de uma casa; médias mostram até duas.
 */
export function formatRating(value: number | null | undefined, maximumFractionDigits = 2): string {
  if (value === null || value === undefined) return "–";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits });
}
