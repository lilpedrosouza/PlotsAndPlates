import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { Db } from "./client";
import { MIGRATIONS_DIR } from "./paths";
import * as schema from "./schema";

/**
 * O mínimo do ambiente do Supabase de que as migrations e as policies dependem:
 * os papéis, o schema `auth` com a tabela de usuários e a função `auth.uid()`.
 */
const SUPABASE_BOOTSTRAP = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create table auth.users (
    id uuid primary key,
    email varchar(255)
  );

  create function auth.uid() returns uuid
    language sql stable
    as $$ select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid $$;

  grant usage on schema public to anon, authenticated, service_role;
  grant usage on schema auth to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

export type TestDb = {
  db: Db;
  /** Cria um usuário em `auth.users` e devolve o id. */
  createAuthUser: (id: string, email?: string) => Promise<string>;
  close: () => Promise<void>;
};

/** Postgres em memória (PGlite) com o schema do PAP aplicado, para os testes. */
export async function createTestDb(): Promise<TestDb> {
  const client = new PGlite();
  await client.exec(SUPABASE_BOOTSTRAP);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });

  return {
    db: db as unknown as Db,
    createAuthUser: async (id, email = `${id}@pap.test`) => {
      await db.execute(sql`insert into auth.users (id, email) values (${id}, ${email})`);
      return id;
    },
    close: () => client.close(),
  };
}
