// Sorteio com mais de uma opção: o baralho embaralha, a carta de cima vira e mostra o sorteado,
// também no segundo sorteio seguido.
//   node scripts/perf/checks/sorteio.mjs [--base http://localhost:3100] [--world plates|plots]
import { args, launch, login } from "../lib.mjs";

const { base, world } = args({ base: "http://localhost:3100", world: "plates" });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });
await login(page, base);
await page.goto(`${base}/${world}/${world === "plots" ? "quero-ver" : "quero-ir"}`, { waitUntil: "networkidle2" });
await sleep(800);
const trigger = await page.waitForSelector("button ::-p-text(O que a gente faz hoje?)", { visible: true });
await trigger.evaluate((node) => node.closest("button").click());
await sleep(1200);

const options = await page.evaluate(() => (document.querySelector('[role="dialog"]')?.innerText.match(/(\d+) OPÇÕES NO BARALHO/i) ?? [])[1] ?? "?");
const results = [];
for (const round of [1, 2]) {
  const button = await page.waitForSelector(`[role="dialog"] button ::-p-text(${round === 1 ? "Sortear" : "Sortear de novo"})`, { visible: true });
  await button.evaluate((node) => node.closest("button").click());
  const revealed = await page
    .waitForFunction(() => /saiu!/i.test(document.querySelector('[role="dialog"]')?.innerText ?? ""), { timeout: 4000 })
    .then(() => true)
    .catch(() => false);
  results.push(revealed);
  console.log(`${revealed ? "ok  " : "FAIL"} ${round}º sorteio com ${options} opções mostra o sorteado em até 4 s`);
  if (!revealed) break;
  await sleep(1500);
}
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
