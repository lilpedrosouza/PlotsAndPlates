// Mapa: o MapLibre só é pedido depois do maior paint da tela (LCP), e o mapa ainda aparece.
//   node scripts/perf/checks/mapa.mjs [--base http://localhost:3100]
import { args, launch, login, markAchievementsSeen } from "../lib.mjs";

const { base } = args({ base: "http://localhost:3100" });
const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 412, height: 823, isMobile: true, hasTouch: true });
await login(page, base);
await markAchievementsSeen(page, base);
await page.goto(`${base}/plates`, { waitUntil: "networkidle2" });

await page.evaluateOnNewDocument(() => {
  window.__lcp = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) window.__lcp = entry.startTime;
  }).observe({ type: "largest-contentful-paint", buffered: true });
});
const cdp = await page.createCDPSession();
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

const scripts = [];
page.on("response", async (response) => {
  if (response.request().resourceType() !== "script") return;
  const body = await response.text().catch(() => "");
  if (body.includes("maplibre")) scripts.push(response.url());
});
await page.goto(`${base}/plates/mapa`, { waitUntil: "networkidle0", timeout: 60000 });
await page.waitForSelector(".maplibregl-canvas", { timeout: 30000 }).catch(() => {});
const timing = await page.evaluate((urls) => {
  const entries = performance.getEntriesByType("resource").filter((entry) => urls.includes(entry.name));
  return { lcp: window.__lcp, mapStart: entries.length ? Math.min(...entries.map((entry) => entry.startTime)) : null, canvas: Boolean(document.querySelector(".maplibregl-canvas")) };
}, scripts);
await browser.close();

const ok = timing.mapStart !== null && timing.mapStart > timing.lcp && timing.canvas;
console.log(`${ok ? "ok  " : "FAIL"} MapLibre pedido em ${Math.round(timing.mapStart ?? -1)} ms, LCP em ${Math.round(timing.lcp)} ms, mapa na tela: ${timing.canvas}`);
process.exit(ok ? 0 : 1);
