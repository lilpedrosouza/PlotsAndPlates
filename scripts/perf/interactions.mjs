// Interações do PAP com a CPU 4x mais lenta, em tela de celular com toque.
// Para cada interação: a maior latência de evento (Event Timing, a base do INP)
// e os intervalos entre quadros durante a animação que ela dispara.
//   node scripts/perf/interactions.mjs --base http://localhost:3100 --label local-antes [--only sorteio]
import path from "node:path";
import { ROOT, args, firstHref, launch, login, markAchievementsSeen, writeJson } from "./lib.mjs";

const opts = args({ base: "http://localhost:3100", label: "medicao", only: "", window: "1500", dpr: "2.625" });
const BASE = opts.base.replace(/\/$/, "");
const WINDOW = Number(opts.window);

/** Instalado antes de cada documento: coleta eventos e quadros sob demanda. */
const PROBE = () => {
  const state = { events: [], frames: [], recording: false, last: 0 };
  window.__perf = state;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.interactionId) state.events.push({ name: entry.name, duration: entry.duration, id: entry.interactionId });
    }
  }).observe({ type: "event", buffered: true, durationThreshold: 16 });
  const loop = (now) => {
    if (state.recording) {
      if (state.last) state.frames.push(now - state.last);
      state.last = now;
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  state.start = () => {
    state.events = [];
    state.frames = [];
    state.last = 0;
    state.recording = true;
  };
  state.stop = () => {
    state.recording = false;
    return { events: state.events, frames: state.frames };
  };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function newPage(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: Number(opts.dpr), isMobile: true, hasTouch: true });
  await page.evaluateOnNewDocument(PROBE);
  return page;
}

async function throttle(page, rate) {
  const cdp = await page.createCDPSession();
  await cdp.send("Emulation.setCPUThrottlingRate", { rate });
}

/** Toque no centro de um elemento (seletor CSS ou do puppeteer: ::-p-text, ::-p-aria). */
async function tap(page, selector) {
  // O primeiro elemento visível (há navegações duplicadas para celular e computador).
  let handle = null;
  for (let tries = 0; tries < 40 && !handle; tries++) {
    for (const candidate of await page.$$(selector)) {
      if (await candidate.isVisible()) {
        handle = candidate;
        break;
      }
    }
    if (!handle) await sleep(500);
  }
  if (!handle) throw new Error(`nada visível para ${selector}`);
  const before = await handle.boundingBox();
  await handle.scrollIntoView();
  // Rolou até o alvo? Espera os pedaços novos da tela serem pintados antes de tocar:
  // ninguém toca no mesmo milissegundo da rolagem, e o raster por software do Chromium
  // sem tela atrasaria a apresentação do quadro do toque (medido: +190 ms).
  const after = await handle.boundingBox();
  if (before && after && Math.abs(before.y - after.y) > 1) await sleep(700);
  const box = await handle.boundingBox();
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

/** Prepara sem CPU lenta, mede a ação com CPU 4x. */
async function measure(page, act, window = WINDOW) {
  await throttle(page, 4);
  await page.evaluate(() => window.__perf.start());
  await act();
  await sleep(window);
  const { events, frames } = await page.evaluate(() => window.__perf.stop());
  await throttle(page, 1);
  const sorted = [...frames].sort((a, b) => a - b);
  const pct = (p) => (sorted.length ? Math.round(sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] * 10) / 10 : null);
  const byInteraction = new Map();
  for (const event of events) byInteraction.set(event.id, Math.max(byInteraction.get(event.id) ?? 0, event.duration));
  return {
    inp: byInteraction.size ? Math.max(...byInteraction.values()) : 0,
    interactions: byInteraction.size,
    frames: { count: sorted.length, median: pct(0.5), p95: pct(0.95), max: pct(1), over50: sorted.filter((f) => f > 50).length },
  };
}

/** Abre a tela e dispensa o aviso de conquista se ele aparecer (ações medidas destravam conquistas). */
const goto = async (page, route) => {
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle2" });
  await sleep(400);
  const dismiss = await page.$("::-p-text(Que demais!)");
  if (dismiss && (await dismiss.isVisible())) {
    await dismiss.click();
    await sleep(800);
  }
};
const year = new Date().getFullYear();

/** Cada interação: prepara a tela (sem medir) e devolve a ação medida. */
const INTERACTIONS = {
  "trocar-mundo": async (page) => {
    await goto(page, "/plates");
    return () => tap(page, 'nav[aria-label="Trocar de seção"] a[href="/plots"]');
  },
  "abrir-ficha": async (page) => {
    await goto(page, "/plates");
    await page.waitForSelector('a[href^="/plates/r/"]');
    return () => tap(page, 'a[href^="/plates/r/"]');
  },
  "registrar-visita": async (page, ctx) => {
    await goto(page, ctx.restaurant);
    return () => tap(page, "::-p-text(Nova visita)");
  },
  avaliar: async (page, ctx) => {
    await goto(page, ctx.restaurant);
    await tap(page, "::-p-text(Avaliar), ::-p-text(Mudar nota)");
    await page.waitForSelector('[role="slider"]', { visible: true });
    await sleep(600);
    return () => tap(page, '[role="slider"]');
  },
  "carimbo-fomos": async (page) => {
    await goto(page, "/plates/quero-ir");
    return () => tap(page, "::-p-text(Fomos!)");
  },
  "registrar-sessao": async (page, ctx) => {
    await goto(page, ctx.title);
    return () => tap(page, "::-p-text(Assistimos)");
  },
  "reordenar-lista": async (page, ctx) => {
    if (!ctx.list) return null;
    await goto(page, ctx.list);
    return () => tap(page, '[aria-label^="Descer "]:not([disabled])');
  },
  sorteio: async (page) => {
    await goto(page, "/plates/quero-ir");
    await tap(page, "::-p-text(O que a gente faz hoje?)");
    await sleep(900);
    return () => tap(page, '[role="dialog"] button ::-p-text(Sortear)');
  },
  "stories-avancar": async (page) => {
    await goto(page, `/plots/wrapped/${year}`);
    await page.waitForSelector('[data-story]');
    await sleep(800);
    return async () => {
      await page.touchscreen.tap(330, 450);
    };
  },
  "stories-segurar": async (page) => {
    await goto(page, `/plots/wrapped/${year}`);
    await page.waitForSelector('[data-story]');
    await sleep(800);
    return async () => {
      await page.touchscreen.touchStart(330, 450);
      await sleep(500);
      await page.touchscreen.touchEnd();
    };
  },
  "busca-tmdb": async (page) => {
    await goto(page, "/plots/buscar");
    const input = 'input[placeholder="Nome do filme ou da série"]';
    await page.waitForSelector(input);
    return async () => {
      await tap(page, input);
      await page.keyboard.type("a chuva ", { delay: 60 });
    };
  },
};

const browser = await launch();
const setup = await newPage(browser);
await login(setup, BASE);
await markAchievementsSeen(setup, BASE);
const ctx = {
  restaurant: await firstHref(setup, BASE, "/plates", "/plates/r/"),
  title: await firstHref(setup, BASE, "/plots", "/plots/t/"),
  list: await firstHref(setup, BASE, "/plots/listas", "/plots/listas/").catch(() => null),
};
await setup.close();

const results = {};
for (const [name, prepare] of Object.entries(INTERACTIONS)) {
  if (opts.only && !opts.only.split(",").some((f) => name.includes(f))) continue;
  const page = await newPage(browser);
  try {
    const act = await prepare(page, ctx);
    if (!act) {
      console.log(`${name.padEnd(18)} (sem dados para medir)`);
      continue;
    }
    await sleep(500);
    const result = await measure(page, act);
    results[name] = result;
    const f = result.frames;
    const flag = result.inp >= 200 || f.over50 > 0 || (f.median ?? 0) > 16.7 ? "  <<<" : "";
    console.log(`${name.padEnd(18)} INP ${String(Math.round(result.inp)).padStart(4)} ms  quadros n=${f.count} med ${f.median} p95 ${f.p95} max ${f.max} >50ms ${f.over50}${flag}`);
  } catch (error) {
    results[name] = { error: String(error.message ?? error) };
    console.log(`${name.padEnd(18)} ERRO ${error.message ?? error}`);
  } finally {
    await page.close();
  }
}
// Aviso de conquista: precisa de uma conta com conquistas ainda não vistas
// (no modo local, a da Bia; em produção, PERF_EMAIL_B/PERF_PASSWORD_B, que perdem o aviso depois da 1ª vez).
if (!opts.only || "aviso-conquista".includes(opts.only)) {
  const local = /localhost|127\.0\.0\.1/.test(BASE);
  const email = process.env.PERF_EMAIL_B ?? (local ? "bia@pap.local" : null);
  const password = process.env.PERF_PASSWORD_B ?? (local ? "papdemo" : null);
  if (email && password) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width: 412, height: 915, deviceScaleFactor: Number(opts.dpr), isMobile: true, hasTouch: true });
    await page.evaluateOnNewDocument(PROBE);
    try {
      await page.goto(`${BASE}/entrar`, { waitUntil: "networkidle2" });
      await page.type('input[name="email"]', email);
      await page.type('input[name="password"]', password);
      // CPU 4x desde o login; os quadros contam a partir do aviso no DOM (o carregamento da página não entra).
      await throttle(page, 4);
      await page.click('button[type="submit"]');
      await page.waitForSelector('[aria-labelledby="desbloqueio-titulo"], #desbloqueio-titulo', { timeout: 30000 });
      await throttle(page, 1);
      const result = await measure(page, async () => {}, 1800);
      results["aviso-conquista"] = result;
      const f = result.frames;
      console.log(`${"aviso-conquista".padEnd(18)} quadros n=${f.count} med ${f.median} p95 ${f.p95} max ${f.max} >50ms ${f.over50}`);
    } catch (error) {
      results["aviso-conquista"] = { error: String(error.message ?? error) };
      console.log(`aviso-conquista    ERRO ${error.message ?? error}`);
    } finally {
      await context.close();
    }
  }
}

writeJson(/antes|depois/.test(opts.label) ? path.join(ROOT, "docs/performance/data", `${opts.label}-interacoes.json`) : path.join(ROOT, ".perf", opts.label, "interacoes.json"), results);
await browser.close();
