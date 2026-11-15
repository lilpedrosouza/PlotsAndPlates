// JavaScript da primeira carga (os scripts que o HTML da tela pede) das telas do dia a dia:
// tamanho comprimido (gzip) e se zod ou supabase-js vêm junto. As pré-buscas de outras rotas não contam.
//   node scripts/perf/checks/js.mjs [--base http://localhost:3100] [--max-kb 0]
import { gzipSync } from "node:zlib";
import { args } from "../lib.mjs";

const opts = args({ base: "http://localhost:3100", "max-kb": "0" });
/** Marcas de bibliotecas que não devem estar na primeira carga. */
const FORBIDDEN = { ZodError: "zod", GoTrueClient: "supabase-js" };
let failed = false;
const cache = new Map();
const chunk = async (src) => {
  if (!cache.has(src)) {
    const body = await (await fetch(new URL(src, opts.base))).text();
    cache.set(src, { gz: gzipSync(body).length, libs: Object.entries(FORBIDDEN).filter(([mark]) => body.includes(mark)).map(([, lib]) => lib) });
  }
  return cache.get(src);
};

for (const route of ["/entrar", "/plates", "/plates/quero-ir", "/plots", "/plots/quero-ver"]) {
  const html = await (await fetch(`${opts.base}${route}`)).text();
  // Scripts noModule (compatibilidade com navegadores antigos) não são baixados pelos navegadores atuais.
  const srcs = [...new Set([...html.matchAll(/<(?:script|link)[^>]*(?:src|href)="(\/_next\/static\/[^"]+\.js)"[^>]*>/g)].filter((match) => !/noModule/i.test(match[0])).map((match) => match[1]))];
  let total = 0;
  const zod = [];
  for (const src of srcs) {
    const info = await chunk(src);
    total += info.gz;
    for (const lib of info.libs) zod.push(`${lib} em ${src.split("/").pop()}`);
  }
  const kb = Math.round(total / 1024);
  const tooBig = Number(opts["max-kb"]) > 0 && kb > Number(opts["max-kb"]);
  if (zod.length || tooBig) failed = true;
  console.log(`${zod.length || tooBig ? "FAIL" : "ok  "} ${route.padEnd(18)} JS ${kb} KB gzip (${srcs.length} arquivos)${zod.length ? ` — ${zod.join(", ")}` : ""}`);
}
process.exit(failed ? 1 : 0);
