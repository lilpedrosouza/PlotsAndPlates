import { userAchievements, profiles, withUser } from "@pap/db";
import { ACHIEVEMENTS, type AchievementKey, type MyAchievements, type PublicAchievement, achievementByKey, isAchievementKey, markSeenSchema } from "@pap/shared";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { evaluateAchievements } from "../achievements/check";
import { notFound } from "../errors";
import type { AppDeps, AppEnv } from "../types";
import { validate } from "../validate";

export function achievementRoutes({ db }: Pick<AppDeps, "db">) {
  const app = new Hono<AppEnv>();

  /** Catálogo com progresso e as desbloqueadas. Confere antes: quem já tinha dados destrava aqui. */
  app.get("/me/achievements", async (c) => {
    const user = c.get("user");
    const { counts } = await evaluateAchievements(db, user.id);
    const rows = await db.select().from(userAchievements).where(eq(userAchievements.userId, user.id));
    const byKey = new Map(rows.map((row) => [row.key, row]));
    const body: MyAchievements = {
      items: ACHIEVEMENTS.map((achievement) => {
        const row = byKey.get(achievement.key);
        return {
          key: achievement.key,
          target: achievement.target,
          progress: row ? achievement.target : Math.min(counts[achievement.key], achievement.target),
          unlockedAt: row ? row.unlockedAt.toISOString() : null,
          seen: Boolean(row?.seenAt),
        };
      }),
    };
    return c.json(body);
  });

  /** A animação de desbloqueio já foi mostrada. */
  app.post("/me/achievements/seen", validate("json", markSeenSchema), async (c) => {
    const user = c.get("user");
    const { keys } = c.req.valid("json");
    await db
      .update(userAchievements)
      .set({ seenAt: new Date() })
      .where(and(eq(userAchievements.userId, user.id), inArray(userAchievements.key, keys), isNull(userAchievements.seenAt)));
    return c.body(null, 204);
  });

  /** Conquistas ganhas de alguém, sem as do casal (diriam quem tem par). */
  app.get("/profiles/:username/achievements", async (c) => {
    const user = c.get("user");
    const username = c.req.param("username").toLowerCase();
    const items = await withUser(db, { sub: user.id }, async (tx) => {
      const [person] = await tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.username, username)).limit(1);
      if (!person) throw notFound("Não achamos ninguém com esse @username.");
      return tx
        .select({ key: userAchievements.key, unlockedAt: userAchievements.unlockedAt })
        .from(userAchievements)
        .where(eq(userAchievements.userId, person.id));
    });
    const body: { items: PublicAchievement[] } = {
      items: items
        .filter((row) => isAchievementKey(row.key) && achievementByKey(row.key as AchievementKey).world !== "casal")
        .map((row) => ({ key: row.key as AchievementKey, unlockedAt: row.unlockedAt.toISOString() })),
    };
    return c.json(body);
  });

  return app;
}
