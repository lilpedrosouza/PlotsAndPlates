import { runMigrations } from "./run-migrations";

/** Aplica as migrations pendentes (pre-deploy da Railway). A API também aplica ao iniciar. */
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Defina DATABASE_URL para rodar as migrations.");
  process.exit(1);
}

try {
  await runMigrations(url);
} catch (error) {
  console.error("Falha ao aplicar as migrations:", error);
  process.exitCode = 1;
}
