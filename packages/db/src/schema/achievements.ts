import { sql } from "drizzle-orm";
import { pgPolicy, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { authUsers, authenticatedRole } from "drizzle-orm/supabase";

/**
 * Conquistas desbloqueadas (o catálogo vive no código, em @pap/shared).
 * Quem grava é só a API, dona das tabelas: uma conquista ganha nunca some.
 * Quem está logado lê as desbloqueadas de qualquer pessoa (o perfil público
 * filtra as do casal no código); `seen_at` só a API lê (grant por coluna).
 */
export const userAchievements = pgTable(
  "user_achievements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
    seenAt: timestamp("seen_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("user_achievements_user_key").on(table.userId, table.key),
    pgPolicy("user_achievements_select_all", { for: "select", to: authenticatedRole, using: sql`true` }),
  ],
);
