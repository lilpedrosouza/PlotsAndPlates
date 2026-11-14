import { fileURLToPath } from "node:url";

/** Pasta das migrations geradas pelo drizzle-kit. */
export const MIGRATIONS_DIR = fileURLToPath(new URL("../migrations", import.meta.url));
