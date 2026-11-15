// Raiz: decide o destino antes de baixar o app; sem storage, o componente atual resolve.
//   node scripts/perf/checks/raiz.mjs [--base http://localhost:3100]
import { args, launch, login } from "../lib.mjs";

const { base } = args({ base: "http://localhost:3100" });
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
};

const browser = await launch();

// Sem sessão: chega em /entrar sem pedir nenhum JS do app na raiz.
{
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const scriptsBeforeLeaving = [];
  let left = false;
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame() && !frame.url().endsWith(`${new URL(base).host}/`)) left = true;
  });
  page.on("request", (request) => {
    if (!left && request.resourceType() === "script" && request.url().includes("/_next/static/")) scriptsBeforeLeaving.push(request.url());
  });
  await page.goto(`${base}/`, { waitUntil: "networkidle2" });
  await page.waitForFunction(() => location.pathname === "/entrar", { timeout: 10000 }).catch(() => {});
  check("sem sessão vai para /entrar", (await page.evaluate(() => location.pathname)) === "/entrar");
  check("nenhum JS do app pedido antes de sair da raiz", scriptsBeforeLeaving.length === 0, `${scriptsBeforeLeaving.length} scripts`);
  await context.close();
}

// Com sessão e último mundo = Plots: vai para /plots.
{
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await login(page, base);
  await page.evaluate(() => localStorage.setItem("pap-secao", "plots"));
  await page.goto(`${base}/`, { waitUntil: "networkidle2" });
  await page.waitForFunction(() => location.pathname === "/plots", { timeout: 10000 }).catch(() => {});
  check("com sessão e pap-secao=plots vai para /plots", (await page.evaluate(() => location.pathname)) === "/plots");
  await page.evaluate(() => localStorage.setItem("pap-secao", "plates"));
  await context.close();
}

// localStorage bloqueado: o componente de fallback leva para /entrar.
{
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("bloqueado");
      },
    });
  });
  await page.goto(`${base}/`, { waitUntil: "networkidle2" });
  await page.waitForFunction(() => location.pathname === "/entrar", { timeout: 15000 }).catch(() => {});
  check("storage bloqueado chega em /entrar", (await page.evaluate(() => location.pathname)) === "/entrar");
  await context.close();
}

await browser.close();
const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\n${failed} falha(s)` : "\ntudo ok");
process.exit(failed ? 1 : 0);
