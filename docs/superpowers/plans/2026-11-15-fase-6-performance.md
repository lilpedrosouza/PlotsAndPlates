# Fase 6 — Performance e animação: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bater Lighthouse mobile ≥ 90, LCP < 2,5 s, INP < 200 ms e CLS < 0,1 nas telas do PAP (ou registrar exceção nos casos que a spec permite), com relatório antes/depois.

**Architecture:** A maior parte do LCP logado vem do `AuthGate` esconder a página até sessão + `/me`; a correção central é renderizar a casca já no HTML e deixar cada componente mostrar o próprio esqueleto. Em volta disso: raiz redirecionando antes do React, CLS, mapa adiado, JS do primeiro carregamento mais leve, caminho quente das conquistas na API e uma bateria de interações com CPU 4x. Medição de trabalho em build de produção local; medição final em produção.

**Tech Stack:** Next 16 (App Router, `cacheComponents`), React 19, TanStack Query 5, Motion 14 (`LazyMotion`), maplibre-gl 6, Hono + Drizzle (API), Lighthouse 12.8.2 + puppeteer-core 24 + web-vitals 5 (só nos roteiros).

**Spec:** `docs/superpowers/specs/2026-11-15-fase-6-performance-design.md`

## Global Constraints

- Metas: Lighthouse mobile **≥ 90**, **LCP < 2,5 s**, **INP < 200 ms**, **CLS < 0,1**; CPU **4x**; quadros: mediana ≤ 16,7 ms e nenhum > 50 ms durante animação.
- Lighthouse 12.8.2, preset mobile padrão, cache limpo a cada rodada, **mediana de 3**.
- Triagem (spec, "Se a meta não fechar"): porta, raiz, caderno, quero ir, diário, quero ver **não** podem ficar abaixo da meta; outras só viram exceção se o que falta for custo estrutural da abordagem A. INP e CLS sem exceção. Mapa é exceção pré-autorizada.
- Sem cookies/SSR com dados, sem trocar bibliotecas, sem mudar visual além do previsto; não esconder conteúdo nem desligar animação para subir nota.
- Chaves só no servidor; credenciais das contas de teste só em variáveis de ambiente (`PERF_EMAIL`, `PERF_PASSWORD`), nunca no repositório.
- RLS e validação de JWT intocadas; `prefers-reduced-motion` respeitado.
- Nada de config de produção (Railway `WEB_ORIGINS`, Supabase, Vercel) muda antes do merge.
- Testes: shared 117, db 59, api 233 seguem verdes (mais os novos); `pnpm typecheck`, `pnpm lint`, `pnpm build`, `npx impeccable detect` sem regressão.
- Textos de interface em pt-BR; commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Pessoa sem sessão abrindo `/plates` direto: vê a casca vazia por um instante e vai para `/entrar`, sem nenhuma chamada autenticada à API (Task 2 verifica pela lista de requisições).
2. Pessoa logada sem perfil (primeiro acesso): vai para `/bem-vindo` e nenhum componente quebra com `me.data` indefinido (Task 2 roteiro).
3. `/me` falhando (API fora): continua aparecendo "Não deu para abrir agora" + "Tentar de novo", não uma tela com esqueletos eternos (Task 2 roteiro com rota interceptada).
4. Raiz com `localStorage` bloqueado ou sem JS: cai no `EntryRedirect` atual e chega em `/entrar` (Task 3 roteiro com storage lançando erro).
5. `GET /me/achievements` sem nada novo não grava nada, mas uma conquista recém-alcançada continua destravando e aparecendo como não vista (Task 8 testes).

---

## Arquivos

- Create `scripts/perf/lighthouse.mjs` — Lighthouse logado/deslogado, mediana de 3, grava `summary.json` + HTML/JSON por tela.
- Create `scripts/perf/interactions.mjs` — interações com CPU 4x, INP via web-vitals e tempos de quadro.
- Create `scripts/perf/lib.mjs` — abrir Chromium, login, marcar conquistas como vistas.
- Create `scripts/perf/README.md` — como rodar (local e produção).
- Modify `package.json` (raiz) — devDependencies `lighthouse@12.8.2`, `puppeteer-core@^24`, `web-vitals@^5`; scripts `perf:lighthouse`, `perf:interactions`.
- Modify `apps/web/package.json` — script `start:perf` (build de produção local apontando para a API local, porta 3100).
- Modify `apps/web/src/components/shell/auth-gate.tsx` e os 8 outros arquivos que chamam `useMe()`.
- Modify `apps/web/src/app/page.tsx` (+ `components/auth/entry-redirect.tsx`) — redirect inline.
- Modify `apps/web/src/app/layout.tsx` — `preconnect`.
- Modify `apps/web/src/components/plots/title-page.tsx`, componentes de perfil/conquistas e o que causar CLS.
- Modify `apps/web/src/components/plates/plates-map.tsx` (+ página do mapa) — mapa adiado.
- Modify `packages/shared/package.json` + imports do web — subcaminhos sem zod.
- Modify `apps/web/src/components/auth/porta-frame.tsx` / fontes — `/entrar`.
- Modify `apps/api/src/achievements/{check,counts}.ts`, `routes/achievements.ts`, `packages/db/src/schema/*visits*.ts` + migration `0015`.
- Modify `apps/web/src/components/wrapped/wrapped-player.tsx`, `components/achievements/unlock-overlay.tsx`.
- Create `docs/performance/fase-6.md`, `docs/performance/lighthouse/*.html`, `docs/performance/data/*.json`.

---

### Task 0: Branch e ledger

- [ ] **Step 1:** `git checkout -b fase-6-performance` a partir de `main` (`d5ec122`).
- [ ] **Step 2:** Ledger em `.superpowers/sdd/2026-11-15-fase-6-performance/progress.md` (scripts `task-start`/`task-done` do executing-plans).

### Task 1: Roteiros de medição e linha de base local

**Files:** Create `scripts/perf/{lib,lighthouse,interactions}.mjs`, `scripts/perf/README.md`; Modify `package.json`, `apps/web/package.json`; Create `docs/performance/data/{prod-antes,local-antes}.json`.

**Interfaces — Produces:**
- `node scripts/perf/lighthouse.mjs --base <url> --label <nome> [--runs 3] [--only <filtro>]` → `docs/performance/data/<label>.json` no formato `{ [tela]: { path, finalUrl, score, lcp, fcp, tbt, cls, si, a11y, bp, scores[] } }` e HTML/JSON da rodada mediana em `.perf/<label>/` (gitignored; o relatório final copia os HTML).
- `node scripts/perf/interactions.mjs --base <url> --label <nome>` → `docs/performance/data/<label>-interacoes.json`: `{ [interacao]: { inp, frames: { median, p95, max, over50 } } }`.
- Variáveis: `PERF_EMAIL`, `PERF_PASSWORD` (obrigatórias para telas logadas); `PERF_API` (para marcar conquistas vistas).
- Telas (nomes fixos, usados no relatório): `porta-entrar` `/entrar`, `raiz` `/`, `plates-caderno`, `plates-quero-ir`, `plates-restaurante` (primeiro `a[href^="/plates/r/"]` do caderno), `plates-perfil`, `plates-pessoas`, `plates-mapa`, `plots-diario`, `plots-quero-ver`, `plots-titulo` (primeiro `a[href^="/plots/t/"]` do diário), `plots-perfil`, `plots-buscar`, `wrapped` (`/plots/wrapped/<ano corrente>`).

- [ ] **Step 1:** Portar o roteiro da linha de base (scratchpad `lh/measure.mjs`) para `scripts/perf/lighthouse.mjs` + `lib.mjs`, com duas correções: rotas públicas (`porta-entrar`, `raiz`) medidas num **contexto de navegador sem sessão** (`browser.createBrowserContext()`), e, antes de medir, marcar todas as conquistas desbloqueadas como vistas (`GET {PERF_API}/v1/me/achievements` → `POST /v1/me/achievements/seen` com as chaves `unlockedAt && !seen`, token tirado do `localStorage` da página logada).
- [ ] **Step 2:** `interactions.mjs`: puppeteer-core, `Emulation.setCPUThrottlingRate {rate: 4}`, viewport 412×915 com toque, injeta `web-vitals/dist/web-vitals.attribution.iife.js` e registra `onINP(..., { reportAllChanges: true })`; quadros por `requestAnimationFrame` durante cada animação. Interações (nomes fixos): `trocar-mundo`, `abrir-ficha` (restaurante do caderno), `registrar-visita`, `carimbo-fomos`, `registrar-sessao`, `reordenar-top4`, `sorteio`, `stories-avancar`, `stories-segurar`, `aviso-conquista`, `busca-tmdb` (digitar 8 caracteres). Cada uma reporta INP e quadros; seletores pelos rótulos/`aria-label` visíveis no app.
- [ ] **Step 3:** `apps/web/package.json`: `"start:perf": "node scripts/copy-map-worker.mjs && NEXT_PUBLIC_API_URL=http://localhost:8787 NEXT_PUBLIC_SUPABASE_URL=http://localhost:8787 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=pap-local next build && next start -p 3100"`. Raiz: devDependencies e scripts `perf:lighthouse`/`perf:interactions`; `.perf/` no `.gitignore`. Conferir que a API local (`pnpm --filter api dev:local`, porta 8787) aceita a origem `http://localhost:3100` (ajustar `WEB_ORIGINS` só do modo local se preciso).
- [ ] **Step 4:** Copiar a linha de base de produção já medida (scratchpad `lh/baseline/summary.json` + números CLI de `/entrar` 95–96/2,7 s e `/` 84/3,6 s) para `docs/performance/data/prod-antes.json`.
- [ ] **Step 5:** Rodar contra o build local (conta `ana@pap.local`/`papdemo`): `perf:lighthouse --base http://localhost:3100 --label local-antes` e `perf:interactions --label local-antes`. Esperado: todas as 14 telas com número; `porta-entrar` termina em `/entrar` e `raiz` em `/entrar` (contexto sem sessão).
- [ ] **Step 6:** Commit `Fase 6: roteiros de medição e linha de base`.

### Task 2: Casca primeiro (AuthGate)

**Files:** Modify `apps/web/src/components/shell/auth-gate.tsx`, `components/shell/world-frame.tsx`, `components/couple/{added-by,partner-block}.tsx`, `components/people/public-profile.tsx`, `components/plots/title-page.tsx`, `components/profile/profile-editor.tsx`, `components/auth/onboarding.tsx` (conferir), `lib/queries.ts` (só se `useMe` precisar).

**Interfaces — Produces:** `AuthGate` renderiza `children` sempre, exceto quando `me.isError` (mostra o aviso atual). Sem sessão (`auth.status === "out"`) → `router.replace("/entrar")`; `me.data.profile === null` → `/bem-vindo`. Componentes que liam `me.data!` tratam `undefined` com o esqueleto local.

- [ ] **Step 1 (RED):** Roteiro `scripts/perf/checks/casca.mjs` (local, porta 3100) que falha hoje: (a) `curl` de `/plates` contém o texto do título fixo do caderno no HTML do servidor; (b) logado, o `h1` da tela existe antes da resposta de `/v1/me` (interceptar `/v1/me` com atraso de 3 s e checar `h1` visível em < 1 s); (c) sem sessão, `/plates` → `/entrar` e nenhuma requisição a `/v1/*` com `Authorization`; (d) conta sem perfil → `/bem-vindo` sem erro no console; (e) `/v1/me` respondendo 500 → texto "Não deu para abrir agora".
- [ ] **Step 2:** Rodar; esperado: (a) e (b) falham, (c)–(e) passam.
- [ ] **Step 3:** Implementar no `AuthGate` e nos usos de `useMe()`.
- [ ] **Step 4:** Rodar `casca.mjs` (tudo passa) e `perf:lighthouse --only plates-caderno --label t2`; esperado LCP local menor que `local-antes`.
- [ ] **Step 5:** `pnpm typecheck && pnpm lint`; commit `Casca das telas logadas aparece antes da sessão e do /me`.

### Task 3: Raiz redireciona antes do React

**Files:** Modify `apps/web/src/app/page.tsx`, `components/auth/entry-redirect.tsx` (fica como fallback).

**Interfaces:** Script inline (via `<script dangerouslySetInnerHTML>` num Server Component) que, em `try`, procura uma chave do `localStorage` casando `/^sb-.+-auth-token$/` com valor não vazio → `location.replace("/" + (localStorage.getItem("pap-secao") === "plots" ? "plots" : "plates"))`, senão `location.replace("/entrar")`; em `catch` não faz nada (o `EntryRedirect` resolve).

- [ ] **Step 1 (RED):** `scripts/perf/checks/raiz.mjs`: sem sessão, `/` chega em `/entrar` e **nenhum** chunk `/_next/static/**/*.js` é requisitado antes da navegação; com sessão e `pap-secao=plots` → `/plots`; com `localStorage` lançando (`Object.defineProperty(window, "localStorage", { get() { throw new Error() } })` via `evaluateOnNewDocument`) → chega em `/entrar`.
- [ ] **Step 2:** Rodar; esperado: o primeiro caso falha.
- [ ] **Step 3:** Implementar. A CSP atual (se houver) precisa permitir o script inline — conferir `next.config.ts`/headers.
- [ ] **Step 4:** Rodar `raiz.mjs` (passa) e `perf:lighthouse --only raiz --label t3`.
- [ ] **Step 5:** Commit `Raiz redireciona antes de carregar o app`.

### Task 4: CLS, preconnect e imagem do detalhe de título

**Files:** Modify `apps/web/src/app/layout.tsx`; `components/plots/title-page.tsx`; os componentes apontados pelo diagnóstico (bloco de conquistas do perfil — `components/achievements/achievements-block.tsx` — e o elemento de mídia sem tamanho no Plots).

- [ ] **Step 1 (RED):** `scripts/perf/checks/cls.mjs`: com CPU 4x e rede lenta simulada, `PerformanceObserver({ type: "layout-shift", buffered: true })` em `plots-diario`, `plots-titulo`, `plates-perfil`, `plots-perfil`; imprime soma e `sources[].node` de cada shift. Esperado hoje: ≥ 0,1 nas quatro (produção mostrou 0,189/0,189/0,145/0,144).
- [ ] **Step 2:** Identificar pelos `sources` o elemento de mídia sem tamanho e corrigir com tamanho/proporção reservados; bloco de conquistas com esqueleto de altura igual ao conteúdo final (16 selos em grade — mesma grade, mesmas linhas).
- [ ] **Step 3:** `layout.tsx`: `<link rel="preconnect">` para `env.apiUrl` (com `crossOrigin="anonymous"`) e `https://image.tmdb.org`. `title-page.tsx`: backdrop com `sizes="100vw"` e o tamanho TMDB `w780` em telas ≤ 780 px (`w1280` acima), mantendo `priority`.
- [ ] **Step 4:** `cls.mjs` < 0,1 nas quatro; `perf:lighthouse --only plots --label t4`.
- [ ] **Step 5:** Commit `Sem pulos de layout no Plots e nos perfis; conexões abertas mais cedo`.

### Task 5: Mapa depois do primeiro paint

**Files:** Modify `apps/web/src/components/plates/plates-map.tsx` e a página `app/plates/(app)/mapa/page.tsx`.

**Interfaces:** `maplibre-gl` só é importado (`import()` dinâmico) depois do primeiro paint, via `requestIdleCallback` (fallback `setTimeout(…, 200)`); o contêiner do mapa mantém o tamanho final desde o início com o fundo do tema; o resto da tela (cabeçalho, filtros, lista) não espera o mapa. `pin-picker.tsx` fica como está.

- [ ] **Step 1 (RED):** `scripts/perf/checks/mapa.mjs`: no carregamento de `/plates/mapa`, o chunk do maplibre é requisitado **depois** do evento LCP; TBT do Lighthouse local registrado antes.
- [ ] **Step 2:** Implementar.
- [ ] **Step 3:** `mapa.mjs` passa; o mapa ainda aparece com os pinos (screenshot); `perf:lighthouse --only plates-mapa --label t5`. Registrar nota e TBT; se < 90, exceção pré-autorizada (anotar no ledger).
- [ ] **Step 4:** Commit `Mapa entra depois do primeiro paint`.

### Task 6: JavaScript do primeiro carregamento

**Files:** Modify `packages/shared/package.json` (`exports`), criar entradas sem zod se necessário (ex.: `packages/shared/src/constants.ts` reexportando só constantes/tipos/funções puras), imports em `apps/web/src/**`; conferir quem puxa o pacote completo de `motion`.

**Interfaces — Produces:** `@pap/shared` continua exportando tudo em `"."` (API e testes não mudam). Novos subcaminhos (nomes finais escolhidos pelo implementador, ex.: `@pap/shared/constants`) **sem** importar `zod`; o web passa a usá-los fora das telas com formulário.

- [ ] **Step 1 (RED):** `scripts/perf/checks/js.mjs`: soma os bytes transferidos de JS na primeira carga de `/plates` e `/plots` (build local) e se algum chunk carregado contém `ZodError`. Esperado hoje: contém.
- [ ] **Step 2:** Separar e trocar imports; listas acima da dobra: confirmar que a virtualização está ativa no caderno/diário e que o primeiro render com dados não passa de ~1 tarefa longa (Performance trace com CPU 4x).
- [ ] **Step 3:** `js.mjs`: nenhum chunk da primeira carga do caderno/diário com `ZodError`; bytes de JS menores que `local-antes` (registrar os dois números). `pnpm --filter @pap/shared test`, `pnpm typecheck`, `pnpm build`.
- [ ] **Step 4:** Commit `Primeiro carregamento sem zod e com menos JS`.

### Task 7: `/entrar` abaixo de 2,5 s

**Files:** Modify `apps/web/src/components/auth/porta-frame.tsx`, `apps/web/src/styles/fonts*.ts`, layout da porta `app/(porta)/layout.tsx` conforme o diagnóstico.

- [ ] **Step 1:** `perf:lighthouse --only porta --label t7-antes` e ler no JSON `lcp-breakdown-insight`, `render-blocking-insight`, `font-display-insight` e a árvore de dependências.
- [ ] **Step 2:** Corrigir o que segura o paint do cartaz: só pré-carregar as fontes usadas acima da dobra na porta, `display: swap` ou `optional` coerente com o desenho (sem trocar a fonte), e o que mais a análise apontar.
- [ ] **Step 3:** `perf:lighthouse --only porta --label t7`: nota ≥ 90 e LCP < 2,5 s locais; screenshot igual ao de antes.
- [ ] **Step 4:** Commit `Porta de entrada pinta mais cedo`.

### Task 8: API — caminho quente das conquistas

**Files:** Modify `apps/api/src/achievements/{check,counts}.ts`, `apps/api/src/routes/achievements.ts`, schema de `visits` em `packages/db/src/schema/`, gerar `packages/db/migrations/0015_*.sql`; Test `apps/api/src/routes/achievements.test.ts`, `packages/db` (migration).

**Interfaces — Produces:**
- `achievementCounts(db: Db, userId: string, partner?: string | null): Promise<AchievementCounts>` — usa `partner` quando recebido (inclusive `null`), só chama `partnerOf` se `undefined`.
- `evaluateAchievements(db, userId, partner?)` — lê as linhas existentes de `user_achievements` primeiro; `INSERT` só das alcançadas que faltam; devolve `{ counts, unlocked, rows }` (`rows`: todas as linhas da pessoa depois da gravação) para a rota não ler de novo.
- `achievementsAfterAction` passa o `partner` que já calculou para a pessoa (para o par, `partnerOf(par) === userId`).
- Índice `visits_together_with_idx` em `visits.together_with`.

- [ ] **Step 1 (RED):** Testes em `achievements.test.ts`: (a) `GET /me/achievements` duas vezes seguidas sem ação no meio → a segunda não executa `INSERT` em `user_achievements` (espionar com contador de queries do PGlite/drizzle logger, ou checar `unlocked_at` inalterado **e** contagem de comandos `insert` = 0); (b) após uma ação que alcança `primeira-mesa`, `GET` devolve `unlockedAt` preenchido e `seen: false`; (c) `achievementCounts(db, id, null)` não consulta `couple_members` (contador de queries).
- [ ] **Step 2:** `pnpm --filter api test achievements` → (a) e (c) falham.
- [ ] **Step 3:** Implementar; índice no schema + `pnpm --filter @pap/db generate` (migration 0015).
- [ ] **Step 4:** `pnpm --filter api test` e `pnpm --filter @pap/db test` verdes; medir `GET /me/achievements` no local (média de 20 chamadas) antes/depois e anotar no ledger.
- [ ] **Step 5:** Commit `Conquistas: GET sem gravação desnecessária, par calculado uma vez e índice em together_with`.

### Task 9: Animações e INP com CPU 4x

**Files:** Modify `apps/web/src/components/wrapped/wrapped-player.tsx`, `components/achievements/unlock-overlay.tsx` e o que o roteiro apontar.

- [ ] **Step 1 (RED):** Acrescentar a `interactions.mjs` dois casos de regressão: `stories-cancelar` (pointerdown, aguarda 300 ms, dispara `pointercancel`, espera 6,5 s → o story precisa ter avançado; hoje fica pausado porque o timer não é limpo) e `aviso-sob-wrapped` (conquista não vista + abrir `/plots/wrapped/<ano>` → o aviso não pode estar visível por baixo do diálogo do Wrapped; trocar de mundo com o aviso já dispensado não o reabre).
- [ ] **Step 2:** Rodar `perf:interactions --label t9-antes`; anotar no ledger todo item com INP ≥ 200 ms ou quadro > 50 ms.
- [ ] **Step 3:** Corrigir: `onPointerCancel` limpa o timer e despausa; aviso de conquista não monta enquanto o Wrapped está aberto e não reaparece para chaves já mostradas na sessão; mais cada engasgo encontrado no Step 2 (animar só `transform`/`opacity`, mover trabalho para fora do frame, `startTransition` em atualizações pesadas).
- [ ] **Step 4:** `perf:interactions --label t9`: todas as interações INP < 200 ms, quadros mediana ≤ 16,7 ms e nenhum > 50 ms; os dois casos novos passam; `prefers-reduced-motion` conferido nos stories e no sorteio.
- [ ] **Step 5:** Commit `Animações sem engasgo com CPU 4x`.

### Task 10: Experimento do proxy de mesma origem (local)

**Files:** só experimento; se aprovado, Modify `apps/web/next.config.ts` (rewrite `/api/:path*`), `lib/env.ts`, `apps/api` (`clientIp`) — senão nenhum arquivo além do ledger/relatório.

- [ ] **Step 1:** Ramo descartável: rewrite `/api/:path*` → API local e `NEXT_PUBLIC_API_URL=/api`; `perf:lighthouse --label t10-proxy` vs o último rótulo sem proxy, telas logadas.
- [ ] **Step 2:** Critério da spec: ganho mediano de LCP ≥ 200 ms **e** IP real do visitante preservado (documentação da Vercel: cabeçalho repassado em rewrites externos; `rate-limit.ts:53` lê o primeiro `x-forwarded-for`). Se ambos: aplicar de verdade com a config de produção listada para o merge (sem mudar produção antes). Se não: descartar e registrar números e motivo.
- [ ] **Step 3:** Commit (se aplicado) `API pelo mesmo domínio do site` ou só a anotação no ledger.

### Task 11: Triagem local e relatório

**Files:** Create `docs/performance/fase-6.md`; Modify `README.md` (estado: fase 6), `apps/web/DESIGN.md` se houve mudança de comportamento visível (casca/esqueletos).

- [ ] **Step 1:** `perf:lighthouse --base http://localhost:3100 --label local-depois` e `perf:interactions --label local-depois`.
- [ ] **Step 2:** Triagem pela regra da spec: cada tela < 90 ou LCP ≥ 2,5 s → é do dia a dia ou corrigível? Se sim, voltar à task correspondente. Exceção só com motivo estrutural (anotar).
- [ ] **Step 3:** Escrever `docs/performance/fase-6.md`: metodologia (ferramentas, preset, mediana de 3, cache limpo, CPU 4x desta máquina), tabela produção antes × produção depois (preenchida na Task 12), tabela local antes × depois, interações (INP e quadros), JS (bytes antes/depois, zod fora), API (tempo de `/me/achievements`), proxy (resultado), exceções com motivo e o que resolveria (abordagem C), como repetir (`scripts/perf/README.md`).
- [ ] **Step 4:** Suítes completas + `pnpm typecheck && pnpm lint && pnpm build` + `npx impeccable detect`; commit `Fase 6: relatório (local)`.

### Task 12: Revisão, merge e medição final em produção

- [ ] **Step 1:** Revisão final do ramo (Agent, general-purpose, opus); corrigir Critical/Important com RED→GREEN.
- [ ] **Step 2:** Perguntar ao Pedro: merge na main + push.
- [ ] **Step 3:** Após autorização: ff-merge, push, esperar `/health` com o commit; conferência só leitura no banco (16 migrations, índice `visits_together_with_idx`).
- [ ] **Step 4:** `perf:lighthouse --base https://plots-and-plates.vercel.app --label prod-depois` com as contas de teste; triagem de novo (se alguma tela do dia a dia falhar só em produção, investigar antes de fechar).
- [ ] **Step 5:** Completar `docs/performance/fase-6.md` com produção antes × depois, copiar os HTML da rodada mediana para `docs/performance/lighthouse/`; commit e push.
- [ ] **Step 6:** Perguntar ao Pedro se apaga as contas `lighthouse_a`/`lighthouse_b`.
