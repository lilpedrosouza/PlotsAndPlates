import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, ACHIEVEMENT_KEYS, type AchievementCounts, achievementByKey, meetsGoal } from "./index";

const counts = (patch: Partial<AchievementCounts>): AchievementCounts => ({
  ...(Object.fromEntries(ACHIEVEMENT_KEYS.map((key) => [key, 0])) as Record<(typeof ACHIEVEMENT_KEYS)[number], number>),
  criticAverage: null,
  ...patch,
});

describe("catálogo de conquistas", () => {
  it("tem 16 chaves únicas, uma por conquista, na ordem do catálogo", () => {
    expect(ACHIEVEMENT_KEYS).toHaveLength(16);
    expect(new Set(ACHIEVEMENT_KEYS).size).toBe(16);
    expect(ACHIEVEMENTS.map((item) => item.key)).toEqual([...ACHIEVEMENT_KEYS]);
  });

  it("metas conforme a spec", () => {
    expect(ACHIEVEMENTS.map((item) => item.target)).toEqual([1, 10, 5, 5, 10, 25, 1, 50, 3, 10, 4, 20, 10, 25, 5, 1]);
    expect(achievementByKey("almas-gemeas").world).toBe("casal");
    expect(achievementByKey("critico-exigente").world).toBe("ambos");
  });

  it("bate a meta pela contagem", () => {
    expect(meetsGoal("volta-ao-mundo", counts({ "volta-ao-mundo": 9 }))).toBe(false);
    expect(meetsGoal("volta-ao-mundo", counts({ "volta-ao-mundo": 10 }))).toBe(true);
  });

  it("crítico exigente precisa de 20 notas e média até 3", () => {
    expect(meetsGoal("critico-exigente", counts({ "critico-exigente": 20, criticAverage: 3.2 }))).toBe(false);
    expect(meetsGoal("critico-exigente", counts({ "critico-exigente": 20, criticAverage: 2.9 }))).toBe(true);
    expect(meetsGoal("critico-exigente", counts({ "critico-exigente": 19, criticAverage: 2 }))).toBe(false);
  });
});
