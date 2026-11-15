// Regressões de animação herdadas da fase 5:
// (1) o sistema cancelar o toque logo depois de encostar não deixa os stories pausados;
// (2) o aviso de conquista não abre por baixo do Wrapped nem volta ao trocar de mundo depois de fechado.
// Usa a conta da Bia no modo local (conquistas ainda não vistas). Reinicie a API antes de rodar de novo.
//   node scripts/perf/checks/animacao.mjs [--base http://localhost:3100]
import { args, launch } from "../lib.mjs";

const { base } = args({ base: "http://localhost:3100" });
const email = process.env.PERF_EMAIL_B ?? "bia@pap.local";
const password = process.env.PERF_PASSWORD_B ?? "papdemo";
const year = new Date().getFullYear();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
};

const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });
await page.goto(`${base}/entrar`, { waitUntil: "networkidle2" });
await page.type('input[name="email"]', email);
await page.type('input[name="password"]', password);
await page.click('button[type="submit"]');
await page.waitForFunction(() => /^\/(plates|plots)/.test(location.pathname), { timeout: 30000 });
const overlayVisible = () =>
  page.evaluate(() => {
    const title = document.getElementById("desbloqueio-titulo");
    return Boolean(title && title.getBoundingClientRect().height > 0);
  });

// (2a) Direto no Wrapped, com conquistas não vistas: o aviso não aparece por baixo.
await page.goto(`${base}/plots/wrapped/${year}`, { waitUntil: "networkidle2" });
await page.waitForSelector("[data-story]", { timeout: 20000 });
await sleep(1500);
check("aviso de conquista não abre com o Wrapped aberto", !(await overlayVisible()));

// (1) Toque cancelado pelo sistema antes de virar "segurar": o story continua andando.
const before = await page.$eval("[data-story]", (node) => node.getAttribute("data-story"));
await page.evaluate(() => {
  const layer = document.querySelector('[role="dialog"] .touch-none');
  const init = { bubbles: true, pointerId: 7, pointerType: "touch", clientX: 300, clientY: 400, isPrimary: true };
  layer.dispatchEvent(new PointerEvent("pointerdown", init));
  setTimeout(() => layer.dispatchEvent(new PointerEvent("pointercancel", init)), 80);
});
await sleep(7000);
const after = await page.$eval("[data-story]", (node) => node.getAttribute("data-story"));
check("toque cancelado não deixa os stories pausados", after !== before, `${before} → ${after}`);

// (2b) Fecha o aviso no Plates e troca de mundo na hora: ele não volta.
await page.goto(`${base}/plates`, { waitUntil: "networkidle2" });
const dismiss = await page.waitForSelector("::-p-text(Que demais!)", { visible: true, timeout: 20000 }).catch(() => null);
check("o aviso aparece fora do Wrapped", Boolean(dismiss));
if (dismiss) {
  await dismiss.click();
  await sleep(600); // a saída do aviso (0,2 s) ainda cobre a tela por um instante
  let link = null;
  for (const candidate of await page.$$('nav[aria-label="Trocar de seção"] a[href="/plots"]')) if (await candidate.isVisible()) link = candidate;
  await link.click();
  await page.waitForFunction(() => location.pathname === "/plots", { timeout: 10000 });
  let reappeared = false;
  for (let i = 0; i < 10; i++) {
    if (await overlayVisible()) reappeared = true;
    await sleep(200);
  }
  check("aviso fechado não volta ao trocar de mundo", !reappeared);
}

await browser.close();
const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\n${failed} falha(s)` : "\ntudo ok");
process.exit(failed ? 1 : 0);
