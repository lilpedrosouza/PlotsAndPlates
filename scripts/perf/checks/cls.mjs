// CLS das telas que pulavam, com CPU 4x e rede 4G lenta; mostra o que se moveu.
//   node scripts/perf/checks/cls.mjs [--base http://localhost:3100]
import { args, firstHref, launch, login, markAchievementsSeen } from "../lib.mjs";

const { base } = args({ base: "http://localhost:3100" });
const browser = await launch();
const setup = await browser.newPage();
await login(setup, base);
await markAchievementsSeen(setup, base);
const title = await firstHref(setup, base, "/plots", "/plots/t/");
const restaurant = await firstHref(setup, base, "/plates", "/plates/r/");
await setup.close();

const routes = ["/plots", title, "/plates/perfil", "/plots/perfil", "/plates", "/plates/quero-ir", "/plots/quero-ver", restaurant, "/plates/pessoas", "/plots/buscar"];
let worst = 0;
for (const route of routes) {
  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 823, isMobile: true, hasTouch: true, deviceScaleFactor: 1.75 });
  await page.evaluateOnNewDocument(() => {
    window.__shifts = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.hadRecentInput) continue;
        window.__shifts.push({
          value: entry.value,
          sources: entry.sources.map((source) => {
            const node = source.node;
            return node ? `${node.nodeName.toLowerCase()}.${String(node.className?.baseVal ?? node.className ?? "").split(" ").slice(0, 3).join(".")}` : "?";
          }),
        });
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  const cdp = await page.createCDPSession();
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await page.goto(`${base}${route}`, { waitUntil: "networkidle0", timeout: 60000 });
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const shifts = await page.evaluate(() => window.__shifts);
  const total = shifts.reduce((sum, shift) => sum + shift.value, 0);
  worst = Math.max(worst, total);
  console.log(`${total >= 0.1 ? "FAIL" : "ok  "} ${route.padEnd(52)} CLS ${total.toFixed(3)}`);
  for (const shift of shifts.filter((s) => s.value > 0.005)) console.log(`       ${shift.value.toFixed(3)} ← ${shift.sources.join(", ")}`);
  await page.close();
}
await browser.close();
process.exit(worst >= 0.1 ? 1 : 0);
