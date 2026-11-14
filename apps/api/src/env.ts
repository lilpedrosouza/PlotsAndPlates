import { z } from "zod";

const booleanFlag = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),

  /** Postgres do Supabase. Use a connection string do "Session pooler". */
  DATABASE_URL: z.url(),

  /** URL do projeto Supabase, ex.: https://abcd.supabase.co */
  // Só a origem: aceita também a URL colada com caminho (ex.: .../rest/v1/).
  SUPABASE_URL: z.url().transform((value) => new URL(value).origin),
  /** Chave secreta (sb_secret_... ou a antiga service_role). Nunca vai para o cliente. */
  SUPABASE_SECRET_KEY: z.string().min(1),

  /** Origens do site autorizadas no CORS, separadas por vírgula. */
  WEB_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim().replace(/\/+$/, ""))
        .filter(Boolean),
    ),

  MEDIA_BUCKET: z.string().min(1).default("media"),
  BACKUP_BUCKET: z.string().min(1).default("backups"),

  /** Liga as tarefas agendadas (ping, backup). Deixe "true" só em produção. */
  CRON_ENABLED: booleanFlag,
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`).join("\n");
    throw new Error(`Variáveis de ambiente inválidas ou ausentes:\n${problems}\nVeja apps/api/.env.example.`);
  }
  return parsed.data;
}
