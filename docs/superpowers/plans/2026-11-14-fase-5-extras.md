# Fase 5 — Wrapped, sorteio e conquistas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PAP Wrapped do casal em stories, sorteio "O que a gente faz hoje?" nas listas de vontade e conquistas desbloqueadas na hora, guardadas para sempre.

**Architecture:** Regras puras no shared (catálogo de conquistas, contas do Wrapped, sorteio), uma tabela nova `user_achievements` (RLS + GRANT), API com `checkAchievements` chamada depois das ações que contam e `loadWrapped` calculado na hora. Site: camadas `lib/achievements`, `lib/wrapped`, `lib/draw`; componentes em `components/achievements`, `components/wrapped`, `components/draw`.

**Tech Stack:** igual às fases anteriores; nova dependência só no site: `modern-screenshot` (story → PNG no aparelho).

**Spec:** `docs/superpowers/specs/2026-11-14-fase-5-extras-design.md`

## Global Constraints

- Médias de casal e comunidade sempre calculadas (`coupleRating`), nunca guardadas.
- Conquista ganha nunca some; a verificação nunca derruba a ação de quem registrou (erro vira log).
- Wrapped só para a pessoa e o par de agora; terceiros nunca; perfil público mostra conquistas ganhas menos as do mundo "casal".
- Animações só com `transform`/`opacity`; `prefers-reduced-motion` = dissolve, sem avanço automático no Wrapped.
- RLS + `GRANT` explícito em tabela nova; telas com a skill `impeccable`; lições anteriores (Suspense para `usePathname` em rotas dinâmicas, consultas sem RLS fora da transação nos testes, `patchOf`).
- Tom informal, primeira pessoa do plural; nada de marca/cores/layout de Spotify Wrapped ou Letterboxd.

## Review Focus

1. **Ano sem nenhum dado** (ou pessoa nova) → `GET /wrapped` não lista o ano; abrir o ano direto mostra estado vazio, sem erro (teste na Task 4).
2. **Sorteio com 0 ou 1 item depois dos filtros, e "sortear de novo"** → vazio mostra atalho para limpar filtros; um item revela direto; não repete até esgotar (testes na Task 1).
3. **Falha ao conferir conquistas** → a visita/registro é salvo e responde normalmente (teste na Task 3).
4. **Primeira conferência de quem já tem muitos dados** → todas destravam com a data do dia e o site mostra uma animação agrupada, não N seguidas (teste de API na Task 3; navegador na Task 7).
5. **Casal sem nenhuma nota em comum no ano** → stories 8 e 9 somem; `couple` vem com `agreed`/`disagreed` nulos (teste na Task 4).

---

### Task 1: Regras no shared

**Files:** Create `packages/shared/src/achievements/{catalog,types,index}.ts`, `packages/shared/src/wrapped/{types,stats,index}.ts`, `packages/shared/src/draw/{pool,index}.ts` + testes `*.test.ts` em cada pasta; Modify `packages/shared/src/index.ts`.

**Interfaces — Produces:**
- `ACHIEVEMENT_KEYS` (16, nesta ordem): `primeira-mesa`, `volta-ao-mundo`, `fregues`, `explorador-de-bairros`, `sobremesa-sempre`, `caderno-cheio`, `primeira-sessao`, `cinefilo`, `maratonista`, `documentarista`, `top-4`, `critico-exigente`, `almas-gemeas`, `juntos-sempre`, `opinioes-fortes`, `primeiro-encontro`; `type AchievementKey`.
- `type AchievementWorld = "plates" | "plots" | "ambos" | "casal"`; `type Achievement = { key; world; name; description; target: number; unit: string }` (unit p/ progresso: "cozinhas", "visitas"…); `ACHIEVEMENTS: readonly Achievement[]`; `achievementByKey(key)`.
- Metas: 1, 10, 5, 5, 10, 25, 1, 50, 3, 10, 4, 20, 10, 25, 5, 1.
- `type AchievementCounts = Record<AchievementKey, number> & { criticAverage: number | null }`; `meetsGoal(key, counts): boolean` (crítico exigente: contagem ≥ 20 **e** `criticAverage ≤ 3`).
- `type AchievementState = { key; progress: number; target: number; unlockedAt: string | null; seen: boolean }`; `type MyAchievements = { items: AchievementState[] }`; `type PublicAchievement = { key; unlockedAt: string }`.
- `sessionMinutes(log: { tmdbType: "movie"|"tv"; runtime: number|null; episodeCount: number|null }): number` (filme: runtime; série: episódios × runtime; faltando dado: 0).
- `topBy<T>(items: T[], keyOf: (t: T) => string, tiebreak?: (key: string) => number): { key: string; count: number } | null` (mais frequente; empate → maior `tiebreak`, depois ordem alfabética).
- `closestAndFarthest<T extends { mine: number; partner: number }>(pairs: T[]): { equal: number; agreed: T | null; disagreed: T | null }` (agreed = menor diferença; disagreed = maior diferença, só se > 0; empate → primeiro da lista).
- Wrapped: `type WrappedComparison = { kind: "restaurant" | "title"; id: string; name: string; imageUrl: string | null; mine: number; partner: number }`; `type Wrapped = { year; partial: boolean; people: PersonRef[]; plates: { restaurants; visits; dishes; favoriteCuisine: { name; count } | null; mostVisited: { id; name; coverThumbUrl: string|null; visits: number } | null; champion: { id; name; coverThumbUrl: string|null; ratings: SideBySide } | null }; plots: { sessions; together; minutes; titles; favoriteGenre: { name; count } | null; mostWatched: { id; title; posterPath: string|null; tmdbType: "movie"|"tv"; sessions: number } | null; champion: { id; title; posterPath: string|null; tmdbType: "movie"|"tv"; ratings: SideBySide } | null }; couple: { equal: number; agreed: WrappedComparison | null; disagreed: WrappedComparison | null } | null; achievements: PublicAchievement[] }`; `type WrappedYears = { years: number[] }`.
- Sorteio: `type DrawItem = { id: string; addedByBoth: boolean; cuisines?: string[]; priceLevel?: number | null; titleKind?: TitleKind; runtime?: number | null; onMyStreamings?: boolean }`; `type DrawFilters = { cuisine?: string; maxPrice?: number; kinds?: TitleKind[]; maxMinutes?: 90 | 120; onlyMyStreamings?: boolean; onlyBoth?: boolean }`; `filterPool(items, filters): DrawItem[]` (sem runtime não passa em `maxMinutes`); `nextPick(poolIds: string[], recent: string[], random: () => number): { id: string; recent: string[] }` (sorteia entre os não recentes; esgotou → zera `recent` e não repete o último).

- [ ] **Step 1: Testes** — `achievements.test.ts`: 16 chaves únicas, metas acima, `meetsGoal("critico-exigente", {…20, criticAverage: 3.2})` false e com 2.9 true. `wrapped.test.ts`: `sessionMinutes` filme 104 → 104, série 8 eps × 50 → 400, sem runtime → 0; `topBy` empate decide por `tiebreak`; `closestAndFarthest` conta iguais, agreed = menor diferença, disagreed nulo quando todas iguais, lista vazia → `{equal:0, agreed:null, disagreed:null}`. `draw.test.ts`: `filterPool` por cuisine/maxPrice/kinds/maxMinutes/onlyMyStreamings/onlyBoth; `nextPick` com 3 ids e random fixo percorre os 3 sem repetir, no 4º não repete o 3º; pool de 1 devolve ele.
- [ ] **Step 2: Rodar** `pnpm --filter @pap/shared exec vitest run` → FAIL (módulos não existem).
- [ ] **Step 3: Implementar** os módulos acima (textos de nome/descrição do catálogo conforme a tabela da spec).
- [ ] **Step 4: Rodar** → PASS.
- [ ] **Step 5: Commit** "Fase 5: regras de conquistas, Wrapped e sorteio no shared".

### Task 2: Tabela `user_achievements`

**Files:** Create `packages/db/src/schema/achievements.ts`, migrations geradas `0012_*` (renomear para `0012_user_achievements`) + custom `0013_grants_achievements`; Test `packages/db/src/achievements-rls.test.ts`.

**Interfaces — Produces:** `userAchievements` (`id`, `user_id` → auth.users cascade, `key` text, `unlocked_at` timestamptz default now, `seen_at` timestamptz null; único (`user_id`,`key`)). Policies: select pelo dono, pelo par (`public.partner_of(auth.uid())`) e por qualquer autenticado (o perfil público filtra no código o mundo "casal"); sem insert/update/delete para `authenticated` (só a API, dona). Grants: `SELECT` para authenticated; anon revogado.

- [ ] **Step 1: Teste RLS**: tabela com RLS ligada; Bia não insere nem atualiza linha da Ana; anon não lê.
- [ ] **Step 2: Rodar** `pnpm --filter @pap/db exec vitest run src/achievements-rls` → FAIL.
- [ ] **Step 3: Schema + `pnpm --filter @pap/db generate` + grants custom.**
- [ ] **Step 4: Rodar** → PASS; suite db inteira verde.
- [ ] **Step 5: Commit** "Conquistas: tabela user_achievements".

### Task 3: Conquistas na API

**Files:** Create `apps/api/src/achievements/{counts,check}.ts`, `apps/api/src/routes/achievements.ts`; Modify `apps/api/src/app.ts` (rota), `routes/visits.ts`, `routes/restaurants.ts` (criar com "fomos"), `routes/ratings.ts`, `routes/dishes.ts` (nota de prato), `routes/logs.ts`, `routes/plots-watchlist.ts` (Assistimos! e Top 4), `routes/couple.ts` (aceitar); Test `apps/api/src/routes/achievements.test.ts`.

**Interfaces — Produces:**
- `achievementCounts(db: Db, userId: string): Promise<AchievementCounts>` (conexão dona; visitas = próprias + "juntos" com `together_with = userId`; casal = com o par atual; contagens conforme spec: cozinhas distintas e bairros distintos dos restaurantes visitados, maior nº de visitas a um restaurante, sobremesas avaliadas, restaurantes visitados, sessões, filmes (kind "filme") distintos registrados, maratona = máx. de temporadas distintas da mesma série com `watched_on` numa janela de 7 dias, documentários distintos, tamanho do Top 4, notas (restaurante geral + título atual) e sua média, notas iguais/≥2 de diferença com o par em restaurante/prato/título, visitas+sessões "juntos" (sessões contam uma vez por `group_id`), vínculo atual).
- `checkAchievements(db: Db, userIds: string[]): Promise<AchievementKey[]>` → grava as que batem a meta com `on conflict do nothing`; devolve as novas; nunca lança (captura e `console.warn`).
- `afterAction(db, userId)`: confere quem agiu e o par atual (usado pelas rotas, depois da transação).
- Rotas: `GET /v1/me/achievements` → `MyAchievements` (chama `checkAchievements` antes, então quem já tinha dados destrava na primeira abertura); `POST /v1/me/achievements/seen` `{ keys: AchievementKey[] }` → 204 (grava `seen_at` só nas da pessoa); `GET /v1/profiles/:username/achievements` → `{ items: PublicAchievement[] }` sem as de mundo "casal".

- [ ] **Step 1: Testes** — "primeira visita destrava Primeira mesa na hora (GET mostra unlockedAt e seen=false)"; "seen marca e não volta"; "apagar a visita não tira a conquista"; "visita juntos conta para o par (Primeira mesa da Bia)"; "almas gêmeas: 10 notas iguais destravam para os dois"; "maratonista: 3 temporadas da mesma série em 7 dias sim, em 8 dias não"; "crítico exigente exige média ≤ 3"; "quem já tinha dados destrava tudo na primeira consulta"; "perfil público sem as do casal"; "falha na conferência não derruba a visita" (injeta `db` que falha só em `user_achievements`, ou espiona `checkAchievements` para lançar — a rota responde 201).
- [ ] **Step 2: Rodar** `pnpm --filter @pap/api exec vitest run src/routes/achievements` → FAIL.
- [ ] **Step 3: Implementar** counts/check/rotas e as chamadas `afterAction` nas rotas listadas (depois do commit, junto com `writeMirror` onde houver).
- [ ] **Step 4: Rodar** o arquivo e a suite da API → PASS.
- [ ] **Step 5: Commit** "Conquistas na API".

### Task 4: Wrapped na API

**Files:** Create `apps/api/src/wrapped/load.ts`, `apps/api/src/routes/wrapped.ts`; Modify `app.ts`; Test `apps/api/src/routes/wrapped.test.ts`.

**Interfaces — Produces:** `loadWrapped(db: Db, viewerId: string, year: number, storage): Promise<Wrapped>` (pessoas = quem pede + par atual; contas da spec; visita "juntos" conta uma vez; sessões dos dois com espelho contado uma vez por `group_id`; `partial` = ano corrente; `couple` nulo sem par); `wrappedYears(db, viewerId): Promise<number[]>` (anos com visita ou sessão de qualquer um dos dois, decrescente). Rotas `GET /v1/wrapped` → `WrappedYears`, `GET /v1/wrapped/:year` (ano inteiro 2000–2100, senão 400) → `Wrapped`.

- [ ] **Step 1: Testes** — casal com visita juntos + visita solo de cada um → `restaurants`/`visits` certos; pratos distintos; cozinha favorita com empate; sessão juntos (espelho) conta 1, `together` 1; minutos de filme + temporada; campeões por média do casal; concordância/discordância e `equal`; sem notas em comum → `agreed`/`disagreed` nulos; sem par → `couple` nulo e `people` com 1; ano sem dados → `/wrapped` não lista e `/wrapped/2019` devolve zeros; terceiro não vê nada do casal (o Wrapped dele só tem ele).
- [ ] **Step 2: Rodar** → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar** arquivo + suite → PASS.
- [ ] **Step 5: Commit** "Wrapped na API".

### Task 5: Camada de dados do site

**Files:** Create `apps/web/src/lib/achievements/queries.ts` (`useMyAchievements`, `useMarkSeen`, `usePublicAchievements(username)`, `refreshAchievements(queryClient)`), `apps/web/src/lib/wrapped/queries.ts` (`useWrappedYears`, `useWrapped(year)`); Modify as mutações de Plates/Plots/casal para chamar `refreshAchievements` no `onSettled`.

- [ ] Typecheck do site verde; commit "Extras: camada de dados do site".

### Task 6: Desenho (impeccable)

**Files:** Create `apps/web/.impeccable/surfaces/src-app-extras.md`: Wrapped (stories nos dois mundos, números grandes, passagem entre mundos), baralho do sorteio, selos/placas de conquista e a animação de desbloqueio (individual e agrupada).

- [ ] Commit "Extras: brief de desenho".

### Task 7: Conquistas no site

**Files:** Create `components/achievements/{badge,achievements-block,unlock-overlay}.tsx`; Modify `components/providers.tsx` (overlay global que observa `useMyAchievements` e mostra as não vistas: 1 → animação do selo; 2+ → "Vocês já tinham N conquistas!"), `components/profile/profile-editor.tsx` (bloco), `components/people/public-profile.tsx` (ganhas).

- [ ] Navegador: primeira visita destrava com animação; conta com dados mostra o agrupado; movimento reduzido; perfil público. Commit "Conquistas no site".

### Task 8: Sorteio no site

**Files:** Create `components/draw/{draw-sheet,deck}.tsx`, `lib/draw/items.ts` (`fromWishlist(RestaurantSummary[], meId)`, `fromWatchlist(WatchlistItem[], meId)` → `DrawItem[]`); Modify `components/plates/notebook.tsx` (quero ir) e `components/plots/watchlist.tsx` (botão "O que a gente faz hoje?").

- [ ] Navegador: filtros, embaralhar e revelar, "Sortear de novo" sem repetir, vazio e um item, "Fomos!"/"Assistimos!" a partir do sorteado; celular e computador. Commit "Sorteio no site".

### Task 9: Wrapped no site

**Files:** Create `components/wrapped/{wrapped-player,stories,share}.tsx`, rotas `app/plates/(app)/wrapped/[ano]/{page,loading}.tsx` e `app/plots/(app)/wrapped/[ano]/{page,loading}.tsx` (Suspense), entrada no perfil (`components/wrapped/wrapped-card.tsx`) e aviso de dezembro/1ª semana de janeiro no caderno e no diário; Modify `lib/section.ts` (espelhar `/wrapped/<ano>`); adicionar `modern-screenshot`.

- [ ] Navegador: toques, segurar, teclado, avanço automático, stories pulados sem dado, sem par, imagem PNG gerada (download no Chromium), movimento reduzido, CPU 4x. Commit "Wrapped no site".

### Task 10: Verificação final

Checagem completa (tipos, lint, testes, build), navegador (celular e computador, CPU 4x, movimento reduzido), `impeccable detect`, DESIGN.md e README, revisão independente, correções Críticas/Importantes com teste, pedir autorização de merge/push.
