import { type Db, type Profile, type Tx, coupleMembers, profiles } from "@pap/db";
import type { PersonRef } from "@pap/shared";
import { and, eq, inArray, ne } from "drizzle-orm";
import type { MediaStorage } from "../storage";

type Reader = Db | Tx;

/** Id do par de alguém, ou null. */
export async function partnerOf(db: Reader, userId: string): Promise<string | null> {
  const [mine] = await db.select({ coupleId: coupleMembers.coupleId }).from(coupleMembers).where(eq(coupleMembers.userId, userId));
  if (!mine) return null;
  const [other] = await db
    .select({ userId: coupleMembers.userId })
    .from(coupleMembers)
    .where(and(eq(coupleMembers.coupleId, mine.coupleId), ne(coupleMembers.userId, userId)));
  return other?.userId ?? null;
}

export function personRef(row: Pick<Profile, "id" | "username" | "displayName" | "avatarPath">, storage: MediaStorage): PersonRef {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    avatarUrl: row.avatarPath ? storage.publicUrl(row.avatarPath) : null,
  };
}

/** Perfis por id, para mostrar quem adicionou ou registrou algo. */
export async function peopleById(db: Reader, ids: readonly string[], storage: MediaStorage): Promise<Map<string, PersonRef>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const rows = await db.select().from(profiles).where(inArray(profiles.id, unique));
  return new Map(rows.map((row) => [row.id, personRef(row, storage)]));
}
