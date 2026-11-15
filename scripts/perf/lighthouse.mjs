// Lighthouse mobile nas telas do PAP, logado e deslogado. Mediana de N rodadas, cache limpo a cada uma.
//   node scripts/perf/lighthouse.mjs --base http://localhost:3100 --label local-antes [--runs 3] [--only plates]
import fs from "node:fs";
import path from "node:path";
import lighthouse from "lighthouse";
import { ROOT, args, firstHref, launch, login, markAchievementsSeen, median, writeJson } from "./lib.mjs";

const opts = args({ base: "http://localhost:3100", label: "medicao", runs: "3", only: "" });
const BASE = opts.base.replace(/\/$/, "");
const RUNS = Number(opts.runs);
const outDir = path.join(ROOT, ".perf", opts.label);
fs.mkdirSync(outDir, { recursive: true });

const browser = await launch();
const port = Number(new URL(browser.wsEndpoint()).port);

const page = await browser.newPage();
await login(page, BASE);
const marked = await markAchievementsSeen(page, BASE);
const restaurant = await firstHref(page, BASE, "/plates", "/plates/r/");
const title = await firstHref(page, BASE, "/plots", "/plots/t/");
await page.close();
if (marked) console.log(`(${marked} conquistas marcadas como vistas antes de medir)`);

const year = new Date().getFullYear();
const ROUTES = [
  ["porta-entrar", "/entrar", false],
  ["raiz", "/", false],
  ["plates-caderno", "/plates", true],
  ["plates-quero-ir", "/plates/quero-ir", true],
  ["plates-restaurante", restaurant, true],
  ["plates-perfil", "/plates/perfil", true],
  ["plates-pessoas", "/plates/pessoas", true],
  ["plates-mapa", "/plates/mapa", true],
  ["plots-diario", "/plots", true],
  ["plots-quero-ver", "/plots/quero-ver", true],
  ["plots-titulo", title, true],
  ["plots-perfil", "/plots/perfil", true],
  ["plots-buscar", "/plots/buscar", true],
  ["wrapped", `/plots/wrapped/${year}`, true],
].filter(([name]) => !opts.only || opts.only.split(",").some((f) => name.includes(f)));

async function runOnce(url, loggedIn) {
  if (loggedIn) {
    const blank = await browser.newPage();
    const cdp = await blank.createCDPSession();
    await cdp.send("Network.clearBrowserCache");
    await blank.close();
    return lighthouse(url, { port, output: ["json", "html"], onlyCategories: ["performance", "accessibility", "best-practices"], disableStorageReset: true, logLevel: "error" });
  }
  // Rotas públicas: navegador à parte, sem sessão nenhuma.
  const clean = await launch();
  try {
    const cleanPort = Number(new URL(clean.wsEndpoint()).port);
    return await lighthouse(url, { port: cleanPort, output: ["json", "html"], onlyCategories: ["performance", "accessibility", "best-practices"], logLevel: "error" });
  } finally {
    await clean.close();
  }
}

// Só as medições de referência (antes/depois) vão para o repositório; as de trabalho ficam em .perf/.
const summaryFile = /antes|depois/.test(opts.label) ? path.join(ROOT, "docs/performance/data", `${opts.label}.json`) : path.join(outDir, "summary.json");
const summary = fs.existsSync(summaryFile) && opts.only ? JSON.parse(fs.readFileSync(summaryFile, "utf8")) : {};
for (const [name, route, loggedIn] of ROUTES) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    const { lhr, report } = await runOnce(`${BASE}${route}`, loggedIn);
    const a = lhr.audits;
    runs.push({
      score: Math.round(lhr.categories.performance.score * 100),
      a11y: Math.round(lhr.categories.accessibility.score * 100),
      bp: Math.round(lhr.categories["best-practices"].score * 100),
      lcp: Math.round(a["largest-contentful-paint"].numericValue),
      fcp: Math.round(a["first-contentful-paint"].numericValue),
      tbt: Math.round(a["total-blocking-time"].numericValue),
      cls: Number(a["cumulative-layout-shift"].numericValue.toFixed(3)),
      si: Math.round(a["speed-index"].numericValue),
      finalUrl: lhr.finalDisplayedUrl.replace(BASE, ""),
      report,
    });
  }
  const mid = [...runs].sort((x, y) => x.score - y.score)[Math.floor(runs.length / 2)];
  fs.writeFileSync(path.join(outDir, `${name}.json`), mid.report[0]);
  fs.writeFileSync(path.join(outDir, `${name}.html`), mid.report[1]);
  const pick = (key) => median(runs.map((r) => r[key]));
  summary[name] = {
    path: route,
    finalUrl: mid.finalUrl,
    score: pick("score"),
    lcp: pick("lcp"),
    fcp: pick("fcp"),
    tbt: pick("tbt"),
    cls: pick("cls"),
    si: pick("si"),
    a11y: mid.a11y,
    bp: mid.bp,
    scores: runs.map((r) => r.score),
  };
  const s = summary[name];
  console.log(`${name.padEnd(20)} ${String(s.score).padStart(3)} [${s.scores}]  LCP ${s.lcp}  TBT ${s.tbt}  CLS ${s.cls}  → ${s.finalUrl}`);
}
writeJson(summaryFile, summary);
await browser.close();
