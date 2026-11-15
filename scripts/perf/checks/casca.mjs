// Casca primeiro: as telas logadas mostram a estrutura (título) sem esperar sessão e /me,
// e o porteiro continua mandando cada um para o lugar certo.
//   node scripts/perf/checks/casca.mjs [--base http://localhost:3100]
import { apiFor, args, launch, login } from "../lib.mjs";

const { base } = args({ base: "http://localhost:3100" });
const API = apiFor(base);
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
};

// (a) O HTML do servidor já traz o título das telas de lista.
for (const route of ["/plates", "/plates/quero-ir", "/plots", "/plots/quero-ver", "/plates/perfil", "/plots/perfil", "/plates/pessoas", "/plots/pessoas", "/plots/buscar"]) {
  const html = await (await fetch(`${base}${route}`)).text();
  const h1 = html.match(/<h1[^>]*>(.*?)<\/h1>/s);
  check(`(a) HTML do servidor com <h1> em ${route}`, Boolean(h1), h1 ? h1[1].replace(/<[^>]+>/g, "").slice(0, 40) : "sem h1");
}

const browser = await launch();
const mobile = { width: 412, height: 915, isMobile: true, hasTouch: true };

// (b) Logado, com /me atrasado 3 s: o título aparece antes.
{
  const page = await browser.newPage();
  await page.setViewport(mobile);
  await login(page, base);
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    if (request.url() === `${API}/v1/me` && request.method() === "GET") setTimeout(() => request.continue(), 3000);
    else request.continue();
  });
  const started = Date.now();
  await page.goto(`${base}/plates`, { waitUntil: "domcontentloaded" });
  const visible = await page.waitForSelector("h1", { visible: true, timeout: 2500 }).then(() => Date.now() - started).catch(() => null);
  check("(b) título do caderno visível antes do /me (atrasado 3 s)", visible !== null && visible < 2500, visible === null ? "não apareceu em 2,5 s" : `${visible} ms`);
  await page.close();
}

// (c) Sem sessão: vai para /entrar sem nenhuma chamada autenticada.
{
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const authed = [];
  page.on("request", (request) => {
    if (request.url().startsWith(`${API}/v1/`) && request.headers().authorization) authed.push(request.url());
  });
  await page.goto(`${base}/plates`, { waitUntil: "networkidle2" });
  await page.waitForFunction(() => location.pathname === "/entrar", { timeout: 10000 }).catch(() => {});
  const path = await page.evaluate(() => location.pathname);
  check("(c) sem sessão vai para /entrar", path === "/entrar", path);
  check("(c) sem sessão nenhuma chamada autenticada", authed.length === 0, authed.join(", "));
  await context.close();
}

// (d) Conta sem perfil: vai para /bem-vindo sem erro no console.
{
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport(mobile);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => message.type() === "error" && !/Failed to load resource/.test(message.text()) && errors.push(message.text()));
  await page.goto(`${base}/cadastro`, { waitUntil: "networkidle2" });
  await page.type('input[name="email"]', `casca-${Date.now()}@pap.local`);
  await page.type('input[name="password"]', "papdemo123");
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => location.pathname === "/bem-vindo", { timeout: 15000 }).catch(() => {});
  await page.goto(`${base}/plates`, { waitUntil: "networkidle2" });
  await page.waitForFunction(() => location.pathname === "/bem-vindo", { timeout: 10000 }).catch(() => {});
  const path = await page.evaluate(() => location.pathname);
  check("(d) sem perfil vai para /bem-vindo", path === "/bem-vindo", path);
  check("(d) sem erro no console", errors.length === 0, errors.slice(0, 2).join(" | "));
  await context.close();
}

// (e) /me com erro: o aviso com "Tentar de novo" aparece.
{
  const page = await browser.newPage();
  await page.setViewport(mobile);
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    if (request.url() === `${API}/v1/me` && request.method() === "GET") {
      request.respond({ status: 500, contentType: "application/json", headers: { "access-control-allow-origin": base }, body: '{"error":{"code":"internal","message":"Falhou."}}' });
    } else request.continue();
  });
  await page.goto(`${base}/plates`, { waitUntil: "networkidle2" });
  const shown = await page.waitForSelector("::-p-text(Não deu para abrir agora)", { visible: true, timeout: 15000 }).then(() => true).catch(() => false);
  check("(e) /me com erro mostra o aviso", shown);
  await page.close();
}

await browser.close();
const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\n${failed} falha(s)` : "\ntudo ok");
process.exit(failed ? 1 : 0);
