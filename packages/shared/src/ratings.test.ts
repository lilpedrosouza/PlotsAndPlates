import { describe, expect, it } from "vitest";
import {
  RATING_VALUES,
  communityRating,
  coupleRating,
  formatRating,
  isValidRating,
  mean,
  overallFromCriteria,
  roundToHalf,
  suggestSeriesRating,
} from "./ratings";

describe("isValidRating", () => {
  it("aceita toda meia estrela de 0,5 a 5", () => {
    for (const value of RATING_VALUES) {
      expect(isValidRating(value)).toBe(true);
    }
  });

  it.each([0, -1, 5.5, 6, 0.25, 3.3, 4.75, Number.NaN, Number.POSITIVE_INFINITY])("rejeita %s", (value) => {
    expect(isValidRating(value)).toBe(false);
  });

  it.each(["4", null, undefined, {}, [4]])("rejeita o que não é número (%j)", (value) => {
    expect(isValidRating(value)).toBe(false);
  });
});

describe("roundToHalf", () => {
  it("mantém notas que já são meia estrela", () => {
    for (const value of RATING_VALUES) {
      expect(roundToHalf(value)).toBe(value);
    }
  });

  it.each([
    [3.1, 3],
    [3.2, 3],
    [3.3, 3.5],
    [3.4, 3.5],
    [3.6, 3.5],
    [3.7, 3.5],
    [3.8, 4],
    [3.9, 4],
    [4.125, 4],
    [4.375, 4.5],
  ])("arredonda %s para %s", (value, expected) => {
    expect(roundToHalf(value)).toBe(expected);
  });

  it("empates arredondam para cima", () => {
    expect(roundToHalf(3.25)).toBe(3.5);
    expect(roundToHalf(3.75)).toBe(4);
    expect(roundToHalf(0.75)).toBe(1);
    expect(roundToHalf(4.75)).toBe(5);
  });

  it("nunca sai do intervalo 0,5–5", () => {
    expect(roundToHalf(0)).toBe(0.5);
    expect(roundToHalf(0.1)).toBe(0.5);
    expect(roundToHalf(-3)).toBe(0.5);
    expect(roundToHalf(5.4)).toBe(5);
    expect(roundToHalf(99)).toBe(5);
  });

  it("recusa valores não finitos", () => {
    expect(() => roundToHalf(Number.NaN)).toThrow(RangeError);
    expect(() => roundToHalf(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe("mean", () => {
  it("calcula a média simples", () => {
    expect(mean([4, 5])).toBe(4.5);
    expect(mean([1, 2, 3, 4])).toBe(2.5);
  });

  it("ignora valores vazios", () => {
    expect(mean([4, null, undefined, 5])).toBe(4.5);
  });

  it("devolve null quando não há nenhuma nota", () => {
    expect(mean([])).toBeNull();
    expect(mean([null, undefined])).toBeNull();
  });
});

describe("overallFromCriteria (nota geral do restaurante)", () => {
  it("é a média dos quatro critérios", () => {
    expect(overallFromCriteria({ food: 4, service: 4, ambiance: 4, value: 4 })).toBe(4);
    expect(overallFromCriteria({ food: 5, service: 4, ambiance: 3, value: 4 })).toBe(4);
  });

  it("arredonda para a meia estrela mais próxima", () => {
    // média 4,125 → 4
    expect(overallFromCriteria({ food: 4.5, service: 4, ambiance: 4, value: 4 })).toBe(4);
    // média 4,375 → 4,5
    expect(overallFromCriteria({ food: 5, service: 4.5, ambiance: 4, value: 4 })).toBe(4.5);
    // média 3,875 → 4
    expect(overallFromCriteria({ food: 4.5, service: 4, ambiance: 3.5, value: 3.5 })).toBe(4);
  });

  it("empate na média arredonda para cima", () => {
    // média 4,25 → 4,5
    expect(overallFromCriteria({ food: 5, service: 4, ambiance: 4, value: 4 })).toBe(4.5);
    // média 2,75 → 3
    expect(overallFromCriteria({ food: 3, service: 3, ambiance: 2.5, value: 2.5 })).toBe(3);
  });

  it("considera só os critérios preenchidos", () => {
    expect(overallFromCriteria({ food: 5, service: 4 })).toBe(4.5);
    expect(overallFromCriteria({ food: 3.5, service: null, ambiance: undefined })).toBe(3.5);
  });

  it("devolve null sem nenhum critério", () => {
    expect(overallFromCriteria({})).toBeNull();
    expect(overallFromCriteria({ food: null })).toBeNull();
  });

  it("extremos continuam dentro do intervalo", () => {
    expect(overallFromCriteria({ food: 0.5, service: 0.5, ambiance: 0.5, value: 0.5 })).toBe(0.5);
    expect(overallFromCriteria({ food: 5, service: 5, ambiance: 5, value: 5 })).toBe(5);
  });
});

describe("suggestSeriesRating (sugestão a partir das temporadas)", () => {
  it("sugere a média das temporadas em meia estrela", () => {
    expect(suggestSeriesRating([5, 4, 4])).toBe(4.5); // 4,33 → 4,5
    expect(suggestSeriesRating([5, 4.5, 3])).toBe(4); // 4,17 → 4
    expect(suggestSeriesRating([3])).toBe(3);
  });

  it("ignora temporadas sem nota", () => {
    expect(suggestSeriesRating([4, null, 5])).toBe(4.5);
  });

  it("não sugere nada sem temporadas avaliadas", () => {
    expect(suggestSeriesRating([])).toBeNull();
    expect(suggestSeriesRating([null])).toBeNull();
  });
});

describe("coupleRating (notas lado a lado + média do casal)", () => {
  it("mantém a nota de cada um e calcula a média sem arredondar", () => {
    expect(coupleRating(4, 4.5)).toEqual({ mine: 4, partner: 4.5, average: 4.25, difference: 0.5 });
    expect(coupleRating(5, 2)).toEqual({ mine: 5, partner: 2, average: 3.5, difference: 3 });
  });

  it("notas iguais têm diferença zero", () => {
    expect(coupleRating(3.5, 3.5)).toEqual({ mine: 3.5, partner: 3.5, average: 3.5, difference: 0 });
  });

  it("com uma nota só, a média é essa nota e não há diferença", () => {
    expect(coupleRating(4, null)).toEqual({ mine: 4, partner: null, average: 4, difference: null });
    expect(coupleRating(undefined, 2.5)).toEqual({ mine: null, partner: 2.5, average: 2.5, difference: null });
  });

  it("sem notas, não há média", () => {
    expect(coupleRating(null, null)).toEqual({ mine: null, partner: null, average: null, difference: null });
  });
});

describe("communityRating", () => {
  it("calcula média e quantidade", () => {
    expect(communityRating([4, 5, 3])).toEqual({ average: 4, count: 3 });
  });

  it("ignora vazios na média e na contagem", () => {
    expect(communityRating([4, null, 5, undefined])).toEqual({ average: 4.5, count: 2 });
  });

  it("sem avaliações, média nula e contagem zero", () => {
    expect(communityRating([])).toEqual({ average: null, count: 0 });
  });
});

describe("formatRating", () => {
  it("usa vírgula decimal e corta zeros", () => {
    expect(formatRating(4)).toBe("4");
    expect(formatRating(4.5)).toBe("4,5");
    expect(formatRating(4.25)).toBe("4,25");
  });

  it("limita as casas decimais", () => {
    expect(formatRating(4.3333)).toBe("4,33");
    expect(formatRating(4.3333, 1)).toBe("4,3");
  });

  it("mostra um traço quando não há nota", () => {
    expect(formatRating(null)).toBe("–");
    expect(formatRating(undefined)).toBe("–");
  });
});
