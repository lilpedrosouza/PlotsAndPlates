import { cp } from "node:fs/promises";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/migrate.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  splitting: false,
  // Os pacotes do monorepo são TypeScript puro: entram no bundle.
  // As dependências do npm ficam em node_modules.
  noExternal: [/^@pap\//],
  onSuccess: async () => {
    await cp("../../packages/db/migrations", "dist/migrations", { recursive: true });
  },
});
