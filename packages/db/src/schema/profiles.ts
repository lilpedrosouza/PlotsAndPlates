import { sql } from "drizzle-orm";
import { check, index, pgPolicy, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole, authUid, authUsers } from "drizzle-orm/supabase";

/**
 * Perfil público de cada conta. O id é o mesmo do usuário no Supabase Auth.
 *
 * RLS: qualquer usuário autenticado lê perfis (a busca e as páginas de perfil
 * dependem disso); cada um cria e edita só o próprio. Não há policy de delete:
 * o perfil some junto com a conta, pelo `on delete cascade`.
 */
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    username: text("username").notNull(),
    displayName: text("display_name").notNull(),
    bio: text("bio").notNull().default(""),
    avatarPath: text("avatar_path"),
    bannerPath: text("banner_path"),
    accent: text("accent").notNull().default("padrao"),
    streamings: text("streamings")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("profiles_username_key").on(table.username),
    index("profiles_display_name_idx").on(sql`lower(${table.displayName})`),
    check("profiles_username_format", sql`${table.username} ~ '^[a-z][a-z0-9_.]{2,19}$'`),
    check("profiles_display_name_length", sql`char_length(${table.displayName}) between 1 and 50`),
    check("profiles_bio_length", sql`char_length(${table.bio}) <= 280`),
    pgPolicy("profiles_select_authenticated", {
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
    pgPolicy("profiles_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${table.id} = ${authUid}`,
    }),
    pgPolicy("profiles_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${table.id} = ${authUid}`,
      withCheck: sql`${table.id} = ${authUid}`,
    }),
  ],
);

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
