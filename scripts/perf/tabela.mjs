// Tabela markdown antes × depois a partir de docs/performance/data/<rótulo>.json.
//   node scripts/perf/tabela.mjs prod-antes prod-depois
//   node scripts/perf/tabela.mjs local-antes-interacoes local-depois-interacoes
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib.mjs";

const [before, after] = process.argv.slice(2);
const load = (label) => JSON.parse(fs.readFileSync(path.join(ROOT, "docs/performance/data", `${label}.json`), "utf8"));
const a = load(before);
const b = load(after);
const s = (ms) => (ms === undefined ? "–" : `${(ms / 1000).toFixed(1).replace(".", ",")} s`);
const c = (v) => (v === undefined ? "–" : String(v).replace(".", ","));

if (before.endsWith("interacoes")) {
  console.log("| Interação | INP antes | INP depois | Quadros > 50 ms antes | depois | Mediana dos quadros depois |");
  console.log("|---|---|---|---|---|---|");
  for (const name of Object.keys(b)) {
    const x = a[name] ?? {};
    const y = b[name];
    const inp = (r) => (r?.inp ? `${Math.round(r.inp)} ms` : "–");
    console.log(`| ${name} | ${inp(x)} | ${inp(y)} | ${x.frames?.over50 ?? "–"} | ${y.frames?.over50 ?? "–"} | ${y.frames?.median ? `${c(y.frames.median)} ms` : "–"} |`);
  }
} else {
  console.log("| Tela | Nota antes | Nota depois | LCP antes | LCP depois | TBT antes | TBT depois | CLS antes | CLS depois |");
  console.log("|---|---|---|---|---|---|---|---|---|");
  for (const name of Object.keys(b).filter((key) => !key.startsWith("_"))) {
    const x = a[name] ?? {};
    const y = b[name];
    const ms = (v) => (v === undefined ? "–" : `${Math.round(v)} ms`);
    console.log(`| ${name} | ${x.score ?? "–"} | **${y.score}** | ${s(x.lcp)} | ${s(y.lcp)} | ${ms(x.tbt)} | ${ms(y.tbt)} | ${c(x.cls)} | ${c(y.cls)} |`);
  }
}
