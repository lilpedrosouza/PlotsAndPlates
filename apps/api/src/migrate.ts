import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/**
 * Aplica as migrations pendentes antes de a API subir (pre-deploy da Railway).
 * No build, a pasta `packages/db/migrations` é copiada para `dist/migrations`.
 */
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Defina DATABASE_URL para rodar as migrations.");
  process.exit(1);
}

const migrationsFolder = process.env.MIGRATIONS_DIR ?? fileURLToPath(new URL("./migrations", import.meta.url));
const client = postgres(url, { prepare: false, max: 1 });

try {
  await migrate(drizzle(client), { migrationsFolder });
  console.log("Migrations aplicadas.");
} catch (error) {
  console.error("Falha ao aplicar as migrations:", error);
  process.exitCode = 1;
} finally {
  await client.end({ timeout: 5 });
}
