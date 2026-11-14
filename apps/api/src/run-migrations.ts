import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/** Host, porta, usuário e banco da connection string, sem a senha (para os logs). */
export function describeDatabase(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.username}@${parsed.host}${parsed.pathname}`;
  } catch {
    return "(DATABASE_URL inválida)";
  }
}

/**
 * Aplica as migrations pendentes. No build, `packages/db/migrations` é copiada
 * para `dist/migrations`, ao lado do arquivo gerado.
 */
export async function runMigrations(url: string): Promise<void> {
  const migrationsFolder = process.env.MIGRATIONS_DIR ?? fileURLToPath(new URL("./migrations", import.meta.url));
  const client = postgres(url, { prepare: false, max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(client), { migrationsFolder });
    const [row] = await client<{ table: string | null }[]>`select to_regclass('public.profiles')::text as table`;
    console.log(`Migrations aplicadas em ${describeDatabase(url)} (profiles: ${row?.table ?? "AUSENTE"}).`);
  } finally {
    await client.end({ timeout: 5 });
  }
}
