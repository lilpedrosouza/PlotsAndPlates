import { sql } from "drizzle-orm";
import { check, index, pgPolicy, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { authUid, authUsers, authenticatedRole } from "drizzle-orm/supabase";

/**
 * Casal: duas pessoas ligadas por um convite aceito. Cada pessoa está em no
 * máximo um casal (`user_id` único). Quem grava é a API (dona das tabelas),
 * depois de validar o convite; quem está logado só lê o que é seu.
 *
 * `public.partner_of(uid)` (migration custom) devolve o par de alguém e é a
 * base das policies que mostram ao par o que é privado.
 */
export const coupleMembers = pgTable(
  "couple_members",
  {
    coupleId: uuid("couple_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("couple_members_user_key").on(table.userId),
    index("couple_members_couple_idx").on(table.coupleId),
    pgPolicy("couple_members_select_own_couple", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.userId} = ${authUid} or ${table.userId} = public.partner_of(${authUid})`,
    }),
  ],
);

export const coupleInvites = pgTable(
  "couple_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromUser: uuid("from_user")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    toUser: uuid("to_user")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (table) => [
    index("couple_invites_to_idx").on(table.toUser, table.status),
    index("couple_invites_from_idx").on(table.fromUser, table.status),
    uniqueIndex("couple_invites_pending_pair_key").on(table.fromUser, table.toUser).where(sql`${table.status} = 'pending'`),
    check("couple_invites_status", sql`${table.status} in ('pending', 'accepted', 'declined', 'cancelled')`),
    check("couple_invites_not_self", sql`${table.fromUser} <> ${table.toUser}`),
    pgPolicy("couple_invites_select_involved", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.fromUser} = ${authUid} or ${table.toUser} = ${authUid}`,
    }),
  ],
);

export type CoupleMember = typeof coupleMembers.$inferSelect;
export type CoupleInvite = typeof coupleInvites.$inferSelect;
