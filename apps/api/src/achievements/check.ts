import { type Db, userAchievements } from "@pap/db";
import { ACHIEVEMENT_KEYS, type AchievementCounts, type AchievementKey, meetsGoal } from "@pap/shared";
import { eq } from "drizzle-orm";
import type { MiddlewareHandler } from "hono";
import { partnerOf } from "../couples/partner";
import type { AppEnv } from "../types";
import { achievementCounts } from "./counts";

type AchievementRow = typeof userAchievements.$inferSelect;

/**
 * Grava as conquistas que a pessoa alcançou e ainda não tinha. Devolve as novas,
 * as contagens e todas as linhas dela (para quem chama não precisar ler de novo).
 * Sem nada novo, não grava nada.
 */
export async function evaluateAchievements(
  db: Db,
  userId: string,
  partner?: string | null,
): Promise<{ counts: AchievementCounts; unlocked: AchievementKey[]; rows: AchievementRow[] }> {
  const [counts, rows] = await Promise.all([
    achievementCounts(db, userId, partner),
    db.select().from(userAchievements).where(eq(userAchievements.userId, userId)),
  ]);
  const owned = new Set(rows.map((row) => row.key));
  const missing = ACHIEVEMENT_KEYS.filter((key) => !owned.has(key) && meetsGoal(key, counts));
  if (missing.length === 0) return { counts, unlocked: [], rows };
  const inserted = await db
    .insert(userAchievements)
    .values(missing.map((key) => ({ userId, key })))
    .onConflictDoNothing()
    .returning();
  return { counts, unlocked: inserted.map((row) => row.key as AchievementKey), rows: [...rows, ...inserted] };
}

/**
 * Confere várias pessoas, cada uma com o par já conhecido. Nunca lança: uma
 * falha aqui não pode desfazer a ação de ninguém.
 */
export async function checkAchievements(db: Db, people: readonly { userId: string | null; partner: string | null }[]): Promise<AchievementKey[]> {
  const unlocked: AchievementKey[] = [];
  const seen = new Set<string>();
  for (const { userId, partner } of people) {
    if (!userId || seen.has(userId)) continue;
    seen.add(userId);
    try {
      unlocked.push(...(await evaluateAchievements(db, userId, partner)).unlocked);
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
    // O par de quem agiu já é conhecido, e o par do par é quem agiu: ninguém é procurado de novo.
    await checkAchievements(db, [
      { userId, partner },
      { userId: partner, partner: userId },
    ]);
  };
}
