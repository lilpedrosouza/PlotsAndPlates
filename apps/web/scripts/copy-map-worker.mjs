/**
 * O MapLibre (v6) roda num Web Worker que ele procura ao lado do próprio
 * módulo. Empacotado pelo Next, esse caminho não existe; então o worker é
 * copiado para public/ e o mapa aponta para ele com setWorkerUrl().
 * Roda antes do dev e do build.
 */
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pkgPath = require.resolve("maplibre-gl/package.json");
const { version } = JSON.parse(readFileSync(pkgPath, "utf8"));
const target = join(here, "..", "public", "maplibre");
mkdirSync(target, { recursive: true });
copyFileSync(join(dirname(pkgPath), "dist", "maplibre-gl-worker.mjs"), join(target, "maplibre-gl-worker.mjs"));
console.log(`maplibre-gl ${version}: worker copiado para public/maplibre/`);
