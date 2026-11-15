import { describe, expect, it } from "vitest";
import { closestAndFarthest, saoPauloYear, sessionMinutes, topBy } from "./index";

describe("sessionMinutes", () => {
  it("filme soma a duração; temporada, episódios × duração", () => {
    expect(sessionMinutes({ tmdbType: "movie", runtime: 104, episodeCount: null })).toBe(104);
    expect(sessionMinutes({ tmdbType: "tv", runtime: 50, episodeCount: 8 })).toBe(400);
  });

  it("sem dado não soma", () => {
    expect(sessionMinutes({ tmdbType: "movie", runtime: null, episodeCount: null })).toBe(0);
    expect(sessionMinutes({ tmdbType: "tv", runtime: 50, episodeCount: null })).toBe(0);
  });
});

describe("topBy", () => {
  it("o mais frequente; empate decide pelo desempate e depois pelo nome", () => {
    const items = ["italiana", "japonesa", "italiana", "japonesa", "árabe"];
    expect(topBy(items, (item) => item, (key) => (key === "japonesa" ? 5 : 1))).toEqual({ key: "japonesa", count: 2 });
    expect(topBy(items, (item) => item)).toEqual({ key: "italiana", count: 2 });
    expect(topBy([], (item: string) => item)).toBeNull();
  });
});

describe("closestAndFarthest", () => {
  it("conta iguais, acha a mais próxima e a mais distante", () => {
    const pairs = [
      { id: "a", mine: 4, partner: 3 },
      { id: "b", mine: 5, partner: 5 },
      { id: "c", mine: 1, partner: 4.5 },
    ];
    const result = closestAndFarthest(pairs);
    expect(result.equal).toBe(1);
    expect(result.agreed?.id).toBe("b");
    expect(result.disagreed?.id).toBe("c");
  });

  it("todas iguais: ninguém discordou", () => {
    expect(closestAndFarthest([{ mine: 3, partner: 3 }]).disagreed).toBeNull();
  });

  it("um item só, com diferença: é discordância, não concordância", () => {
    const result = closestAndFarthest([{ id: "x", mine: 3, partner: 5 }]);
    expect(result.disagreed?.id).toBe("x");
    expect(result.agreed).toBeNull();
  });

  it("sem pares", () => {
    expect(closestAndFarthest([])).toEqual({ equal: 0, agreed: null, disagreed: null });
  });
});

describe("saoPauloYear", () => {
  it("o ano vira à meia-noite de Brasília, não à de Greenwich", () => {
    expect(saoPauloYear(new Date("2027-01-01T02:00:00Z"))).toBe(2026);
    expect(saoPauloYear(new Date("2027-01-01T03:30:00Z"))).toBe(2027);
  });
});
