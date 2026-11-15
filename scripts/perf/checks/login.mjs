// Entrar com senha leva direto ao último mundo, numa troca de tela no navegador
// (sem recarregar a página inteira passando pela raiz).
//   node scripts/perf/checks/login.mjs [--base http://localhost:3100]
import { args, credentials, launch } from "../lib.mjs";

const { base } = args({ base: "http://localhost:3100" });
const { email, password } = credentials(base);
const browser = await launch();
const context = await browser.createBrowserContext();
const page = await context.newPage();
await page.goto(`${base}/entrar`, { waitUntil: "networkidle2" });
const documents = [];
page.on("request", (request) => {
  if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents.push(new URL(request.url()).pathname);
});
await page.type('input[name="email"]', email);
await page.type('input[name="password"]', password);
await page.click('button[type="submit"]');
await page.waitForFunction(() => /^\/(plates|plots)/.test(location.pathname), { timeout: 30000 });
await new Promise((resolve) => setTimeout(resolve, 1500));
await browser.close();

const ok = documents.length === 0;
console.log(`${ok ? "ok  " : "FAIL"} entrar sem recarregar a página — documentos carregados depois do envio: ${documents.length ? documents.join(" → ") : "nenhum"}`);
process.exit(ok ? 0 : 1);
