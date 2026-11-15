// Utilidades dos roteiros de performance: Chromium, login, conquistas vistas, argumentos.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function args(defaults = {}) {
  const out = { ...defaults };
  const list = process.argv.slice(2);
  for (let i = 0; i < list.length; i++) {
    if (list[i].startsWith("--")) out[list[i].slice(2)] = list[i + 1]?.startsWith("--") || list[i + 1] === undefined ? true : list[++i];
  }
  return out;
}

export function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const base = path.join(process.env.HOME, ".cache/ms-playwright");
  const dir = fs.existsSync(base) ? fs.readdirSync(base).filter((d) => /^chromium-\d+$/.test(d)).sort().pop() : null;
  if (!dir) throw new Error("Defina CHROME_PATH (Chromium não encontrado em ~/.cache/ms-playwright).");
  return path.join(base, dir, "chrome-linux64/chrome");
}

export function launch() {
  return puppeteer.launch({ executablePath: chromePath(), headless: true, args: ["--no-sandbox"], defaultViewport: null });
}

/** Credenciais: PERF_EMAIL/PERF_PASSWORD; no modo local, a conta de exemplo. */
export function credentials(base) {
  const local = /localhost|127\.0\.0\.1/.test(base);
  const email = process.env.PERF_EMAIL ?? (local ? "ana@pap.local" : null);
  const password = process.env.PERF_PASSWORD ?? (local ? "papdemo" : null);
  if (!email || !password) throw new Error("Defina PERF_EMAIL e PERF_PASSWORD para medir telas logadas.");
  return { email, password };
}

export function apiFor(base) {
  if (process.env.PERF_API) return process.env.PERF_API;
  return /localhost|127\.0\.0\.1/.test(base) ? "http://localhost:8787" : "https://papapi-production.up.railway.app";
}

/** Token de acesso guardado pelo supabase-js no localStorage da página. */
export async function accessToken(page) {
  return page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && /^sb-.+-auth-token$/.test(key)) return JSON.parse(localStorage.getItem(key) ?? "null")?.access_token ?? null;
    }
    return null;
  });
}

/** Entra pela tela /entrar e espera chegar num dos mundos. */
export async function login(page, base) {
  const { email, password } = credentials(base);
  await page.goto(`${base}/entrar`, { waitUntil: "networkidle2" });
  await page.type('input[name="email"]', email);
  await page.type('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => /^\/(plates|plots)/.test(location.pathname), { timeout: 30000 });
}

/** Marca as conquistas já desbloqueadas como vistas, para o aviso não entrar na medição. */
export async function markAchievementsSeen(page, base) {
  const token = await accessToken(page);
  if (!token) throw new Error("Sem token: o login não gravou a sessão.");
  const api = apiFor(base);
  const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
  const res = await fetch(`${api}/v1/me/achievements`, { headers });
  if (!res.ok) throw new Error(`GET /me/achievements: ${res.status}`);
  const { items } = await res.json();
  const keys = items.filter((item) => item.unlockedAt && !item.seen).map((item) => item.key);
  if (keys.length) {
    const seen = await fetch(`${api}/v1/me/achievements/seen`, { method: "POST", headers, body: JSON.stringify({ keys }) });
    if (!seen.ok) throw new Error(`POST /me/achievements/seen: ${seen.status}`);
  }
  return keys.length;
}

export async function firstHref(page, base, pathname, prefix) {
  await page.goto(`${base}${pathname}`, { waitUntil: "networkidle2" });
  await page.waitForSelector(`a[href^="${prefix}"]`, { timeout: 30000 });
  return page.$eval(`a[href^="${prefix}"]`, (a) => a.getAttribute("href"));
}

export const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

export function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}
