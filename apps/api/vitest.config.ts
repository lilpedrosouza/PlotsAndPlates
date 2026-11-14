import { defineConfig } from "vitest/config";

/**
 * Cada arquivo de teste sobe um Postgres em memória (PGlite) e aplica todas as
 * migrations; com vários arquivos em paralelo isso passa dos 10 s padrão.
 */
export default defineConfig({
  test: {
    hookTimeout: 60_000,
    testTimeout: 30_000,
    maxWorkers: 6,
  },
});
