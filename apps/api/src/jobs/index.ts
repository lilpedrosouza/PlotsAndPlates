import type { Db } from "@pap/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sql } from "drizzle-orm";
import cron from "node-cron";
import { runBackup } from "./backup";

const TIMEZONE = "America/Sao_Paulo";

type JobDeps = {
  db: Db;
  supabase: SupabaseClient;
  databaseUrl: string;
  backupBucket: string;
};

/**
 * Mantém o projeto Free do Supabase ativo: uma consulta no Postgres e uma
 * chamada à API do projeto, para contar como atividade nos dois lados.
 */
export async function pingSupabase({ db, supabase }: Pick<JobDeps, "db" | "supabase">): Promise<void> {
  await db.execute(sql`select 1`);
  const { error } = await supabase.storage.listBuckets();
  if (error) throw new Error(`Ping na API do Supabase falhou: ${error.message}`);
}

function guarded(name: string, job: () => Promise<unknown>) {
  return async () => {
    const startedAt = Date.now();
    try {
      const result = await job();
      console.log(`[cron] ${name} ok em ${Date.now() - startedAt} ms`, result ?? "");
    } catch (error) {
      console.error(`[cron] ${name} falhou:`, error);
    }
  };
}

/** Agenda as tarefas recorrentes. Devolve uma função que cancela todas. */
export function startJobs(deps: JobDeps): () => void {
  const tasks = [
    // Todo dia às 06:00.
    cron.schedule(
      "0 6 * * *",
      guarded("ping", () => pingSupabase(deps)),
      { name: "ping", timezone: TIMEZONE, noOverlap: true },
    ),
    // Domingo às 03:30.
    cron.schedule(
      "30 3 * * 0",
      guarded("backup", () =>
        runBackup({ supabase: deps.supabase, databaseUrl: deps.databaseUrl, bucket: deps.backupBucket }),
      ),
      { name: "backup", timezone: TIMEZONE, noOverlap: true },
    ),
  ];
  console.log("[cron] tarefas agendadas: ping (diário 06:00), backup (domingo 03:30)");
  return () => {
    for (const task of tasks) void task.destroy();
  };
}
