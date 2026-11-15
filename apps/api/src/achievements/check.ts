import { type Db, userAchievements } from "@pap/db";
import { ACHIEVEMENT_KEYS, type AchievementCounts, type AchievementKey, meetsGoal } from "@pap/shared";
import type { MiddlewareHandler } from "hono";
import { partnerOf } from "../couples/partner";
import type { AppEnv } from "../types";
import { achievementCounts } from "./counts";

/** Grava as conquistas que a pessoa alcançou e ainda não tinha. Devolve as novas e as contagens. */
export async function evaluateAchievements(db: Db, userId: string): Promise<{ counts: AchievementCounts; unlocked: AchievementKey[] }> {
  const counts = await achievementCounts(db, userId);
  const reached = ACHIEVEMENT_KEYS.filter((key) => meetsGoal(key, counts));
  if (reached.length === 0) return { counts, unlocked: [] };
  const inserted = await db
    .insert(userAchievements)
    .values(reached.map((key) => ({ userId, key })))
    .onConflictDoNothing()
    .returning({ key: userAchievements.key });
  return { counts, unlocked: inserted.map((row) => row.key as AchievementKey) };
}

/** Confere várias pessoas. Nunca lança: uma falha aqui não pode desfazer a ação de ninguém. */
export async function checkAchievements(db: Db, userIds: readonly (string | null)[]): Promise<AchievementKey[]> {
  const unlocked: AchievementKey[] = [];
  for (const userId of new Set(userIds.filter((id): id is string => Boolean(id)))) {
    try {
      unlocked.push(...(await evaluateAchievements(db, userId)).unlocked);
    } catch (error) {
      console.warn("Não deu para conferir as conquistas:", error);
    }
  }
  return unlocked;
}

/** Ações que contam para alguma conquista (método + caminho dentro de /v1). */
const COUNTED: [string, RegExp][] = [
  ["POST", /^\/v1\/restaurants$/],
  ["POST", /^\/v1\/restaurants\/[^/]+\/(visits|fomos)$/],
  ["PATCH", /^\/v1\/visits\/[^/]+$/],
  ["PUT", /^\/v1\/(restaurants|dishes)\/[^/]+\/rating$/],
  ["POST", /^\/v1\/titles\/[^/]+\/(logs|assistimos)$/],
  ["PATCH", /^\/v1\/logs\/[^/]+$/],
  ["PUT", /^\/v1\/titles\/[^/]+\/(rating|seasons\/\d+\/rating)$/],
  ["PUT", /^\/v1\/me\/favorites$/],
  ["POST", /^\/v1\/couple\/invites\/[^/]+\/accept$/],
];

/**
 * Depois de uma ação que conta e deu certo, confere as conquistas de quem agiu
 * e do par (visita "juntos", registro espelhado e as do casal contam para os dois).
 */
export function achievementsAfterAction(db: Db): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    await next();
    const method = c.req.method;
    if (method === "GET" || c.res.status >= 300) return;
    if (!COUNTED.some(([verb, path]) => verb === method && path.test(c.req.path))) return;
    const userId = c.get("user").id;
    let partner: string | null = null;
    try {
      partner = await partnerOf(db, userId);
    } catch (error) {
      console.warn("Não deu para achar o par ao conferir conquistas:", error);
    }
    await checkAchievements(db, [userId, partner]);
  };
}
