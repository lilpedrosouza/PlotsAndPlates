import { type AchievementKey, achievementByKey } from "./catalog";

/** Contagem de cada conquista, mais a média das notas (para o "Crítico exigente"). */
export type AchievementCounts = Record<AchievementKey, number> & { criticAverage: number | null };

export const CRITIC_MAX_AVERAGE = 3;

export function meetsGoal(key: AchievementKey, counts: AchievementCounts): boolean {
  const reached = counts[key] >= achievementByKey(key).target;
  if (key === "critico-exigente") return reached && counts.criticAverage !== null && counts.criticAverage <= CRITIC_MAX_AVERAGE;
  return reached;
}

export type AchievementState = {
  key: AchievementKey;
  progress: number;
  target: number;
  unlockedAt: string | null;
  seen: boolean;
};

export type MyAchievements = { items: AchievementState[] };

export type PublicAchievement = { key: AchievementKey; unlockedAt: string };
