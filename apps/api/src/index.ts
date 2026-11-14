import { serve } from "@hono/node-server";
import { createDb } from "@pap/db";
import { createClient } from "@supabase/supabase-js";
import { createApp } from "./app";
import { createSupabaseVerifier } from "./auth";
import { loadEnv } from "./env";
import { startJobs } from "./jobs";
import { createSupabaseStorage, ensureBuckets } from "./storage";

const env = loadEnv();

const { db, close } = createDb(env.DATABASE_URL);
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const app = createApp({
  db,
  verifyToken: createSupabaseVerifier(env.SUPABASE_URL),
  storage: createSupabaseStorage(supabase, env.SUPABASE_URL, env.MEDIA_BUCKET),
  webOrigins: env.WEB_ORIGINS,
  // A Railway preenche esta variável em deploys vindos do GitHub.
  commit: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
});

ensureBuckets(supabase, env.MEDIA_BUCKET, env.BACKUP_BUCKET).catch((error: unknown) => {
  console.error("Não foi possível preparar os buckets do Storage:", error);
});

const stopJobs = env.CRON_ENABLED
  ? startJobs({ db, supabase, databaseUrl: env.DATABASE_URL, backupBucket: env.BACKUP_BUCKET })
  : () => {};

const server = serve({ fetch: app.fetch, port: env.PORT, hostname: "0.0.0.0" }, (info) => {
  console.log(`PAP API ouvindo em http://localhost:${info.port} (${env.NODE_ENV})`);
});

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} recebido, encerrando…`);
  stopJobs();
  server.close();
  await close().catch(() => {});
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
