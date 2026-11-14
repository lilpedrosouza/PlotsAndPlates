import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  // Só o schema `public` é nosso; `auth` e `storage` são do Supabase.
  schemaFilter: ["public"],
  entities: {
    roles: { provider: "supabase" },
  },
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
