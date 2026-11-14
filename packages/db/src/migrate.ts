import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { MIGRATIONS_DIR } from "./paths";

/** Aplica as migrations pendentes. Usado localmente (`pnpm db:migrate`) e no deploy. */
export async function runMigrations(url: string, migrationsFolder = MIGRATIONS_DIR): Promise<void> {
  const client = postgres(url, { prepare: false, max: 1 });
  try {
    await migrate(drizzle(client), { migrationsFolder });
  } finally {
    await client.end({ timeout: 5 });
  }
}

const isMain = process.argv[1] !== undefined && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));

if (isMain) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Defina DATABASE_URL para rodar as migrations.");
    process.exit(1);
  }
  runMigrations(url)
    .then(() => {
      console.log("Migrations aplicadas.");
    })
    .catch((error: unknown) => {
      console.error("Falha ao aplicar as migrations:", error);
      process.exit(1);
    });
}
