import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT, PgTransaction } from "drizzle-orm/pg-core";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Schema = typeof schema;

/** Banco independente do driver (postgres.js em produção, PGlite nos testes). */
export type Db = PgDatabase<PgQueryResultHKT, Schema, ExtractTablesWithRelations<Schema>>;
export type Tx = PgTransaction<PgQueryResultHKT, Schema, ExtractTablesWithRelations<Schema>>;

export type DbConnection = {
  db: Db;
  close: () => Promise<void>;
};

export function createDb(url: string): DbConnection {
  // `prepare: false` mantém compatibilidade com o pooler do Supabase.
  const client = postgres(url, { prepare: false, max: 5, idle_timeout: 30 });
  return {
    db: drizzle(client, { schema }) as unknown as Db,
    close: () => client.end({ timeout: 5 }),
  };
}

export type UserClaims = {
  /** Id do usuário (claim `sub` do JWT do Supabase). */
  sub: string;
  email?: string | null;
};

/**
 * Executa `fn` dentro de uma transação com a identidade do usuário: troca para
 * o papel `authenticated` e publica os claims do JWT, exatamente como o
 * Supabase faz. Assim as policies de RLS valem também para a API, como segunda
 * camada de segurança — um bug numa rota não vaza dados de outra pessoa.
 */
export async function withUser<T>(db: Db, claims: UserClaims, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    const payload = JSON.stringify({ sub: claims.sub, email: claims.email ?? null, role: "authenticated" });
    await tx.execute(sql`select set_config('request.jwt.claims', ${payload}, true)`);
    await tx.execute(sql`set local role authenticated`);
    return fn(tx);
  });
}
