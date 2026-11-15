// Quem volta ao quero ver: os primeiros pôsteres são pedidos antes do JavaScript do app
// (pela dica guardada na última visita), sem carregamento preguiçoso.
//   node scripts/perf/checks/lcp-imagem.mjs [--base http://localhost:3100]
import { apiFor, args, launch, login } from "../lib.mjs";

const { base } = args({ base: "http://localhost:3100" });
const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });
await login(page, base);

// No modo local os títulos de exemplo não têm pôster: a lista ganha pôsteres falsos
// e o TMDB devolve uma imagem mínima (em produção são os pôsteres de verdade).
const API = apiFor(base);
const PIXEL = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
await page.setRequestInterception(true);
page.on("request", async (request) => {
  const url = request.url();
  if (url.startsWith("https://image.tmdb.org/")) return request.respond({ status: 200, contentType: "image/png", body: PIXEL });
  if (url.startsWith(`${API}/v1/watchlist`) && request.method() === "GET") {
    const response = await fetch(url, { headers: request.headers() });
    const data = await response.json();
    for (const [index, item] of (data.items ?? data).entries?.() ?? []) item.title.posterPath ||= `/teste-${index}.jpg`;
    return request.respond({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": base }, body: JSON.stringify(data) });
  }
  return request.continue();
});
await page.goto(`${base}/plots/quero-ver`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 1500));

const order = [];
page.on("request", (request) => {
  const type = request.resourceType();
  if (type === "image" || (type === "script" && request.url().includes("/_next/static/"))) order.push({ type, url: request.url() });
});
const cdp = await page.createCDPSession();
await cdp.send("Network.clearBrowserCache");
await page.goto(`${base}/plots/quero-ver`, { waitUntil: "networkidle2" });
const firstImage = order.findIndex((entry) => entry.type === "image" && !entry.url.includes("/brand/"));
// Scripts do app = os <script async> do HTML (o Next também põe um <link rel=preload as=script
// fetchpriority=low> antes de tudo no <head>; esse sai junto e não conta).
const html = await (await fetch(`${base}/plots/quero-ver`)).text();
const lowPreloads = new Set([...html.matchAll(/<link rel="preload" as="script" fetchPriority="low" href="([^"]+)"/g)].map((m) => new URL(m[1], base).href));
const firstScript = order.findIndex((entry) => entry.type === "script" && !lowPreloads.has(entry.url));
const lazy = await page.$$eval('main img[alt^="Pôster de"], img[alt^="Pôster de"]', (imgs) => imgs.slice(0, 3).map((img) => img.getAttribute("loading")));
await browser.close();

const results = [
  [firstImage >= 0 && (firstScript < 0 || firstImage < firstScript), `1º pôster pedido antes dos scripts do app (posição ${firstImage} × 1º script ${firstScript})`],
  [lazy.length > 0 && lazy.every((value) => value !== "lazy"), `os 3 primeiros pôsteres sem loading=lazy (${lazy.join(", ") || "nenhum pôster"})`],
];
for (const [ok, label] of results) console.log(`${ok ? "ok  " : "FAIL"} ${label}`);
process.exit(results.every(([ok]) => ok) ? 0 : 1);
