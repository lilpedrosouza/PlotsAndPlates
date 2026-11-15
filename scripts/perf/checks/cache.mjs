// Última versão guardada no aparelho: a segunda visita mostra a lista antes da API responder;
// sair da conta apaga o que foi guardado; outra conta no mesmo navegador não vê nada da primeira.
//   node scripts/perf/checks/cache.mjs [--base http://localhost:3100]
import { apiFor, args, launch, login } from "../lib.mjs";

const { base } = args({ base: "http://localhost:3100" });
const API = apiFor(base);
const KEY = "pap-cache";
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await launch();
const context = await browser.createBrowserContext();
const page = await context.newPage();
await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });
await login(page, base);

// 1ª visita ao caderno: a lista chega da API e fica guardada.
await page.goto(`${base}/plates`, { waitUntil: "networkidle2" });
await page.waitForSelector('a[href^="/plates/r/"]', { timeout: 20000 });
await sleep(1500); // a gravação no aparelho é agrupada (~1 s)
check("a lista fica guardada no aparelho", await page.evaluate((key) => Boolean(localStorage.getItem(key)), KEY));

// 2ª visita com a API atrasada 3 s: os cartões aparecem antes.
await page.setRequestInterception(true);
const slow = (request) => {
  if (request.url().startsWith(`${API}/v1/`)) setTimeout(() => request.continue(), 3000);
  else request.continue();
};
page.on("request", slow);
const started = Date.now();
await page.goto(`${base}/plates`, { waitUntil: "domcontentloaded" });
const shown = await page
  .waitForSelector('a[href^="/plates/r/"]', { timeout: 2500 })
  .then(() => Date.now() - started)
  .catch(() => null);
check("na 2ª visita a lista aparece antes da API responder (atrasada 3 s)", shown !== null, shown === null ? "não apareceu em 2,5 s" : `${shown} ms`);
page.off("request", slow);
await page.setRequestInterception(false);

// Sair da conta apaga o guardado.
await page.goto(`${base}/plates/perfil`, { waitUntil: "networkidle2" });
const out = await page.waitForSelector("button ::-p-text(Sair da conta)", { visible: true, timeout: 20000 });
await out.evaluate((node) => node.closest("button").click());
await page.waitForFunction(() => location.pathname === "/entrar", { timeout: 15000 }).catch(() => {});
await sleep(1500);
check(
  "sair da conta apaga o que estava guardado",
  await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return !raw || (JSON.parse(raw).clientState?.queries ?? []).length === 0;
  }, KEY),
);

// Outra conta no mesmo navegador: guarda a da 1ª conta, entra com a 2ª e não vê os restaurantes da 1ª.
if (/localhost/.test(base)) {
  const other = page;
  await login(other, base); // Ana de novo, para gravar a lista dela
  await other.goto(`${base}/plates`, { waitUntil: "networkidle2" });
  await sleep(1500);
  const anaCache = await other.evaluate((key) => localStorage.getItem(key), KEY);
  // Troca a sessão pela da Bia sem passar pelo "Sair" (aba esquecida, sessão expirada e outra pessoa entrando).
  await other.evaluate(() => {
    for (const key of Object.keys(localStorage)) if (/^sb-.+-auth-token$/.test(key)) localStorage.removeItem(key);
  });
  await other.evaluate((key, value) => localStorage.setItem(key, value), KEY, anaCache ?? "");
  await other.goto(`${base}/entrar`, { waitUntil: "networkidle2" });
  await other.type('input[name="email"]', "bia@pap.local");
  await other.type('input[name="password"]', "papdemo");
  await other.click('button[type="submit"]');
  await other.waitForFunction(() => /^\/(plates|plots)/.test(location.pathname), { timeout: 30000 });
  await other.setRequestInterception(true);
  other.on("request", (request) => {
    if (request.url().startsWith(`${API}/v1/`)) setTimeout(() => request.continue(), 3000);
    else request.continue();
  });
  await other.goto(`${base}/plates`, { waitUntil: "domcontentloaded" });
  await sleep(1500);
  const leaked = await other.$('a[href^="/plates/r/"]');
  check("outra conta não vê a lista guardada da primeira", !leaked);
}

await browser.close();
const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\n${failed} falha(s)` : "\ntudo ok");
process.exit(failed ? 1 : 0);
