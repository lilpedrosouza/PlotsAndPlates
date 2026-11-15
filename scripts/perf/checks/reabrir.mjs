// Quem volta ao app logado e abre a tela pelo link direto (com a última versão guardada
// no aparelho): nenhuma chamada da API recusada, nenhuma tela de erro, nenhum erro do React.
//   node scripts/perf/checks/reabrir.mjs [--base http://localhost:3100]
import { apiFor, args, launch, login } from "../lib.mjs";

const { base } = args({ base: "http://localhost:3100" });
const API = apiFor(base);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });
await login(page, base);

const ROUTES = ["/plots", "/plates", "/plates/quero-ir", "/plots/quero-ver", "/plates/perfil", "/plots/perfil"];
let failed = 0;
for (const route of ROUTES) {
  // 1ª visita guarda a tela no aparelho; a 2ª é o link direto de quem volta.
  await page.goto(`${base}${route}`, { waitUntil: "networkidle2" });
  await sleep(1500);
  const problems = [];
  const onResponse = (response) => {
    if (response.url().startsWith(`${API}/v1/`) && response.status() >= 400) problems.push(`${response.status()} ${response.url().replace(API, "")}`);
  };
  const onError = (error) => problems.push(`erro: ${error.message.slice(0, 90)}`);
  page.on("response", onResponse);
  page.on("pageerror", onError);
  await page.goto(`${base}${route}`, { waitUntil: "networkidle2" });
  await sleep(1500);
  const text = await page.evaluate(() => document.body.innerText);
  if (/Página inválida|Não deu para abrir/.test(text)) problems.push("tela de erro");
  page.off("response", onResponse);
  page.off("pageerror", onError);
  if (problems.length) failed++;
  console.log(`${problems.length ? "FAIL" : "ok  "} reabrir ${route}${problems.length ? ` — ${problems.join(" | ")}` : ""}`);
}
await browser.close();
process.exit(failed ? 1 : 0);
