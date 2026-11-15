// Nota com estrelas: tocar no meio de uma estrela dá aquela estrela, e na metade
// esquerda dá meia — mesmo quando a caixa da nota estica até a largura da linha.
//   node scripts/perf/checks/estrelas.mjs [--base http://localhost:3100]
import { args, launch } from "../lib.mjs";

const { base } = args({ base: "http://localhost:3100" });
const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true, deviceScaleFactor: 2.625 });
await page.goto(`${base}/plates/estilo`, { waitUntil: "networkidle2" });

const slider = await page.waitForSelector('[role="slider"][aria-label="Sua nota"]', { visible: true });
await slider.scrollIntoView();
await new Promise((r) => setTimeout(r, 300));
const geometry = await slider.evaluate((node) => {
  const box = node.getBoundingClientRect();
  const stars = [...node.querySelectorAll("svg")].map((svg) => svg.getBoundingClientRect());
  return { width: box.width, starsRight: stars.at(-1).right - box.left, stars: stars.map((s) => ({ left: s.left, width: s.width, top: s.top, height: s.height })) };
});
console.log(`caixa da nota: ${Math.round(geometry.width)} px; estrelas ocupam ${Math.round(geometry.starsRight)} px`);

const results = [];
const tapStar = async (index, fraction) => {
  // Limpa a nota antes (tocar na nota atual limpa; teclado também limpa).
  await slider.focus();
  await page.keyboard.press("Delete");
  const star = geometry.stars[index];
  await page.touchscreen.tap(star.left + star.width * fraction, star.top + star.height / 2);
  await new Promise((r) => setTimeout(r, 150));
  return Number(await slider.evaluate((node) => node.getAttribute("aria-valuenow")));
};
for (const [index, fraction, expected] of [
  [3, 0.75, 4],
  [3, 0.25, 3.5],
  [0, 0.75, 1],
  [4, 0.75, 5],
  [1, 0.3, 1.5],
]) {
  const value = await tapStar(index, fraction);
  const ok = value === expected;
  results.push(ok);
  console.log(`${ok ? "ok  " : "FAIL"} toque na estrela ${index + 1} (${Math.round(fraction * 100)}% dela) → ${value} (esperado ${expected})`);
}
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
