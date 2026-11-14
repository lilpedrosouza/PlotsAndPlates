# Fase 2 — Plates completo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cadastro de restaurantes (Google como localizador + OpenStreetMap + manual), visitas, pratos, avaliações por critério, quero ir com "Fomos!", caderno com filtros e mapa.

**Architecture:** Regras e schemas Zod em `packages/shared/src/plates/`; tabelas com RLS em `packages/db/src/schema/plates.ts`; na API, provedores externos isolados em `apps/api/src/places/` (injetados em `AppDeps` para teste) e rotas em `apps/api/src/routes/{places,restaurants,visits,wishlist}.ts`; no site, hooks TanStack Query em `apps/web/src/lib/plates/` e telas em `apps/web/src/components/plates/`.

**Tech Stack:** Next 16.4.6 (App Router, cacheComponents), React 19.3, Tailwind 4, Motion 14.13.0, TanStack Query 5 + TanStack Virtual, MapLibre GL JS + OpenFreeMap, Hono 4, Drizzle 0.45 + PGlite nos testes, Zod 4, vitest.

**Spec:** `docs/superpowers/specs/2026-11-14-fase-2-plates-design.md`

## Global Constraints

- Do Google só se guarda `google_place_id`. Nome, endereço, telefone, horário, fotos e nota do Google nunca vão para o banco nem para o mapa MapLibre.
- Painel do Google só carrega por toque do usuário; sem cache.
- Chaves só em `apps/api`; `GOOGLE_PLACES_API_KEY` opcional (sem ela, só OSM).
- Notas de 0,5 a 5 em passos de 0,5; nota geral = média dos critérios preenchidos arredondada para meia estrela (`overallFromCriteria`); médias de casal/comunidade nunca guardadas.
- RLS em todas as tabelas novas + `GRANT` explícito para `authenticated`; `anon` sem acesso.
- Editar restaurante, fotos do restaurante e pratos: quem cadastrou (fase 4 inclui o par) via `public.can_edit_restaurant(uuid)`.
- Visitas, quero ir: só o dono. Avaliações: dono lê/escreve; outros leem só as públicas.
- Fotos: WebP, até 1600 px, mais miniatura (`IMAGE_PRESETS.photo` / `.thumb`), upload assinado no bucket `media`.
- Interface em pt-BR, tom "a gente"; seguir `apps/web/DESIGN.md` e carregar a skill `impeccable` antes de qualquer tela.
- Animar só `transform`/`opacity`; respeitar `prefers-reduced-motion`; MapLibre só na rota do mapa.
- Nominatim: no máximo 1 requisição/s, User-Agent `PlotsAndPlates/1.0`, sem dados pessoais.
- Next 16: ler `apps/web/node_modules/next/dist/docs/` antes de criar rotas dinâmicas.

## Review Focus

1. **Google sem chave, sem cota (HTTP 429/403) ou fora do ar** → a busca responde com `source: "osm"` em vez de erro (teste na Task 3).
2. **O mesmo lugar cadastrado duas vezes** (mesmo `place_id` ou `osm_ref`, até por usuários diferentes) → `resolve` devolve o restaurante existente; inserção concorrente cai na unicidade e vira 409 com o id existente (testes nas Tasks 3 e 5).
3. **Link do Maps em formatos variados** (`maps.app.goo.gl`, `google.com/maps/place/...@lat,lng`, `?q=`, `?cid=`) → extrai nome/coordenadas ou responde 400 "link não reconhecido" (teste na Task 3).
4. **Usuário que não cadastrou tenta editar restaurante/prato ou ler visita alheia** → 403/404 pela API e bloqueio pelo RLS (testes nas Tasks 2 e 5).
5. **Apagar restaurante/visita/foto** → apaga os arquivos do Storage (foto + miniatura) e as linhas dependentes em cascata (teste na Task 5).

---

### Task 1: Domínio de Plates em `packages/shared`

**Files:**
- Create: `packages/shared/src/plates/schemas.ts`, `packages/shared/src/plates/types.ts`, `packages/shared/src/plates/cuisines.ts`, `packages/shared/src/plates/ranking.ts`, `packages/shared/src/plates/index.ts`
- Modify: `packages/shared/src/index.ts` (exportar `./plates`), `packages/shared/src/profile.ts:108-113` (tipos de upload)
- Test: `packages/shared/src/plates/plates.test.ts`

**Interfaces:**
- Produces (constantes): `DISH_CATEGORIES = ["entrada","principal","sobremesa","bebida"]`, `PRICE_LEVELS = [1,2,3,4]`, `WISHLIST_PRIORITIES = ["alta","media","baixa"]`, `RESTAURANT_SORTS = ["recentes","nota","nome","prioridade"]`, `RESTAURANT_STATUSES = ["fomos","quero-ir","todos"]`, `CUISINES: {key: string; label: string}[]` (≈40 cozinhas, chaves = tags `cuisine` do OSM, ex. `japanese` → "Japonesa"), `cuisineLabel(key: string): string`.
- Produces (schemas Zod + `z.infer` types): `restaurantInputSchema` (name 1–80, address ≤160, neighborhood ≤60, city ≤60, lat/lng opcionais em faixa, phone ≤30, website url opcional, openingHours ≤300, priceLevel opcional, cuisines ≤5, description ≤1000, googlePlaceId opcional, osmRef opcional `^(node|way|relation)/\d+$`, coverPath opcional) → `RestaurantInput`; `restaurantPatchSchema = restaurantInputSchema.partial()`; `visitInputSchema` (visitedOn `YYYY-MM-DD` ≤ hoje, occasion ≤80, amountCents int ≥0 opcional, dishIds uuid[] ≤30, photoPaths ≤10); `dishInputSchema` (name 1–80, description ≤500, priceCents opcional, category, photoPath opcional); `restaurantRatingInputSchema` (food/service/ambiance/value opcionais `isValidRating`, pelo menos um preenchido, review ≤4000, isPrivate default false); `dishRatingInputSchema` (rating obrigatório, comment ≤1000, wouldOrderAgain boolean opcional, isPrivate); `wishlistInputSchema` (reason ≤300, priority default "media"); `restaurantListQuerySchema` (status, cuisine, area — bate em bairro ou cidade —, price, minRating, sort, cursor, limit 1–60 default 24); `autocompleteQuerySchema` (q 2–100, session uuid, near `lat,lng` opcional); `placeResolveSchema` (union de `{googlePlaceId, query}` | `{mapsUrl}` | `{osmRef, query}`); `fomosInputSchema` (visitedOn opcional).
- Produces (tipos de resposta em `types.ts`): `PlaceSuggestion {id: string; source: "google"|"osm"; primary: string; secondary: string; googlePlaceId?: string; osmRef?: string}`, `AutocompleteResponse {source: "google"|"osm"; suggestions: PlaceSuggestion[]}`, `RestaurantDraft {existingId?: string; source: "google+osm"|"osm"|"manual"; fields: RestaurantInput; osmAttribution: boolean}`, `LivePlace {phone?: string; website?: string; openingHours?: string[]; photos: {url: string; attribution: string}[]; mapsUrl: string}`, `RestaurantSummary {id; name; neighborhood; city; cuisines; priceLevel; coverUrl: string|null; coverThumbUrl: string|null; lat; lng; myOverall: number|null; visitCount: number; lastVisitOn: string|null; wishlist: {priority; reason}|null}`, `RestaurantDetail` (= summary + address, phone, website, openingHours, description, googlePlaceId, canEdit: boolean, photos, myRating: RestaurantRating|null, dishes: DishWithScore[], visits: Visit[]), `RestaurantRating`, `Dish`, `DishWithScore {…Dish; score: number|null; ratingCount: number; myRating: DishRating|null; wouldOrderAgainShare: number|null}`, `Visit {id; visitedOn; occasion; amountCents; together; photos: Photo[]; dishIds: string[]}`, `Photo {path; url; thumbUrl}`, `MapPin {id; name; lat; lng; status: "fomos"|"quero-ir"; myOverall}`, `Page<T> {items: T[]; nextCursor: string|null}`.
- Produces (helpers): `rankDishes(dishes: DishWithScore[]): DishWithScore[]` (score desc, nulos no fim, desempate por ratingCount desc e nome), `thumbPathOf(path: string): string` (`foo.webp` → `foo.thumb.webp`).
- Produces (uploads): `UPLOAD_KINDS = ["avatar","banner","restaurant","visit","dish"]`; `SignedUpload` ganha `thumbPath?: string; thumbToken?: string` (só para os três novos).

- [ ] **Step 1: Write the failing tests** em `plates.test.ts`:
  - `restaurantRatingInputSchema` recusa objeto sem nenhum critério ("Dê nota a pelo menos um critério.") e aceita só `{food: 4.5}`; recusa `food: 4.2`.
  - `visitInputSchema` recusa `visitedOn` amanhã e aceita hoje.
  - `restaurantInputSchema` recusa `osmRef: "nodo/1"` e `website: "nao-é-url"`.
  - `rankDishes` ordena `[{score:null},{score:4},{score:4.5}]` como 4.5, 4, null; com scores iguais, maior `ratingCount` primeiro.
  - `thumbPathOf("restaurants/a/b.webp") === "restaurants/a/b.thumb.webp"`.
  - `cuisineLabel("japanese") === "Japonesa"` e `cuisineLabel("desconhecida") === "desconhecida"`.
- [ ] **Step 2:** `pnpm --filter @pap/shared test` → FAIL (módulos inexistentes).
- [ ] **Step 3:** Implementar os arquivos acima. Mensagens de erro em pt-BR.
- [ ] **Step 4:** `pnpm --filter @pap/shared test && pnpm --filter @pap/shared typecheck` → PASS (60 antigos + novos).
- [ ] **Step 5: Commit** `git commit -m "Plates: schemas, tipos e ranking de pratos no shared"`

### Task 2: Tabelas e RLS em `packages/db`

**Files:**
- Create: `packages/db/src/schema/plates.ts`, `packages/db/migrations/0002_plates.sql` (gerada) e `0003_plates_rls_helpers.sql` (custom)
- Modify: `packages/db/src/schema/index.ts`
- Test: `packages/db/src/plates-rls.test.ts`

**Interfaces:**
- Produces (Drizzle): `restaurants`, `restaurantPhotos`, `visits`, `visitPhotos`, `dishes`, `visitDishes`, `dishRatings`, `restaurantRatings`, `restaurantWishlist` + tipos `$inferSelect` (`Restaurant`, `Visit`, …). Colunas conforme a tabela da spec ("Dados"); ids `uuid default gen_random_uuid()`; `created_at`/`updated_at`; FKs com `on delete cascade` (restaurante → fotos, visitas, pratos, notas, quero ir; visita → fotos, visit_dishes; prato → visit_dishes, notas).
- Notas: `numeric(2,1)` com check `x between 0.5 and 5 and x*2 = floor(x*2)`; `restaurant_ratings.overall` coluna gerada `stored`: média dos critérios não nulos, arredondada para meia estrela com empate para cima (`floor(avg*2 + 0.5)/2`), nula se todos nulos; check "pelo menos um critério".
- Únicos: `restaurants.google_place_id`, `restaurants.osm_ref` (parciais, onde não nulos); `(dish_id,user_id)`, `(restaurant_id,user_id)` em notas e quero ir; `(visit_id,dish_id)`.
- Índices: `restaurants(lower(city))`, `restaurants using gin(cuisines)`, `visits(user_id, visited_on desc)`.
- `0003` (custom SQL): `create function public.can_edit_restaurant(rid uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from restaurants where id = rid and created_by = auth.uid()) $$;` + `grant execute` para `authenticated`; `GRANT`s explícitos por tabela (sem `DELETE` onde não há policy de delete); `revoke all … from anon`.
- Policies: as da spec ("Permissões"). Notas: select `user_id = auth.uid() or not is_private`.

- [ ] **Step 1: Write the failing tests** em `plates-rls.test.ts` (mesmo padrão de `rls.test.ts`, usuários ANA e BIA):
  - RLS ligada nas 9 tabelas.
  - BIA lê restaurante criado por ANA; BIA não consegue `update` (0 linhas) nem inserir prato nele (erro); ANA consegue os dois.
  - BIA não vê visitas nem quero ir de ANA.
  - Nota privada de ANA invisível para BIA; pública visível.
  - `overall` de `{food:4, service:4.5}` = 4.5 (4,25 → 4,5); de `{food:4}` = 4; inserir sem critério nenhum falha.
  - `numeric` recusa 4.2.
  - Dois restaurantes com o mesmo `google_place_id` → erro `23505`.
  - Apagar restaurante (ANA) remove visitas, pratos e notas em cascata.
  - `anon` não lê `restaurants`.
- [ ] **Step 2:** `pnpm --filter @pap/db test` → FAIL.
- [ ] **Step 3:** Escrever `plates.ts`; `pnpm db:generate` gera `0002_plates.sql`; `pnpm --filter @pap/db exec drizzle-kit generate --custom --name plates_rls_helpers` e preencher `0003`. A coluna gerada e os índices parciais podem exigir ajuste manual no SQL gerado; o snapshot deve continuar consistente (rodar `db:generate` de novo não pode gerar diff).
- [ ] **Step 4:** `pnpm --filter @pap/db test` → PASS; `pnpm db:generate` → "No schema changes".
- [ ] **Step 5: Commit** `git commit -m "Plates: tabelas, RLS e permissões no banco"`

### Task 3: Provedores de lugar na API (Google, OSM, link do Maps)

**Files:**
- Create: `apps/api/src/places/google.ts`, `apps/api/src/places/osm.ts`, `apps/api/src/places/maps-url.ts`, `apps/api/src/places/match.ts`, `apps/api/src/places/service.ts`, `apps/api/src/places/cache.ts`, `apps/api/src/places/fixtures.ts`
- Test: `apps/api/src/places/places.test.ts`

**Interfaces:**
- Consumes: `PlaceSuggestion`, `AutocompleteResponse`, `RestaurantDraft`, `LivePlace` (Task 1).
- Produces:
  - `type Fetcher = typeof fetch`.
  - `createGooglePlaces(opts: {apiKey: string; fetch?: Fetcher; timeoutMs?: number}): GooglePlaces` com `autocomplete(q, session, near?) → PlaceSuggestion[]`, `location(placeId, session?) → {lat; lng; formattedAddress}` (field mask `location,formattedAddress`), `findPlaceId(text, near?) → string|null` (Text Search, field mask `places.id`), `live(placeId) → LivePlace` (field mask `nationalPhoneNumber,websiteUri,regularOpeningHours.weekdayDescriptions,photos,googleMapsUri`; até 3 fotos via `photos/{name}/media?maxWidthPx=800&skipHttpRedirect=true`). Endpoint base `https://places.googleapis.com/v1`, header `X-Goog-Api-Key` e `X-Goog-FieldMask`. Autocomplete com `includedPrimaryTypes` de comida/bebida (`restaurant`, `cafe`, `bar`, `bakery`, `meal_takeaway`, `ice_cream_shop`, `food_court`), `regionCode: "br"`, `languageCode: "pt-BR"`, `sessionToken`.
  - `class PlacesUnavailable extends Error` (sem chave, 403, 429, 5xx, timeout).
  - `createOsm(opts: {fetch?: Fetcher; now?: () => number}): Osm` com `search(q, near?) → PlaceSuggestion[]` (Nominatim `search?format=jsonv2&countrycodes=br&addressdetails=1&extratags=1`, filtrando `amenity` de comida), `nearby(lat, lng, radiusM) → OsmPlace[]` (Overpass `nwr[amenity~"^(restaurant|cafe|bar|fast_food|pub|ice_cream|food_court)$"](around:r,lat,lng); out center tags;`), `lookup(osmRef) → OsmPlace|null`, `reverse(lat,lng) → {neighborhood; city}`. Nominatim serializado em fila de 1 req/s; User-Agent `PlotsAndPlates/1.0`.
  - `type OsmPlace = {osmRef; name; lat; lng; tags: Record<string,string>}`; `osmToFields(place: OsmPlace): Partial<RestaurantInput>` (addr:street+housenumber, addr:suburb, addr:city, phone/contact:phone, website/contact:website, opening_hours, cuisine split `;`).
  - `parseMapsUrl(url: string) → {name?: string; lat?: number; lng?: number; cid?: string} | null` (puro) e `expandMapsUrl(url, fetch) → string` (segue até 3 redirecionamentos só para hosts `maps.app.goo.gl`, `goo.gl`, `google.com`, `www.google.com`, `maps.google.com`).
  - `nameSimilarity(a, b): number` 0–1 (normaliza acentos/caixa/pontuação, tira palavras como "restaurante", "bar", "cafe"; Dice de bigramas); `pickMatch(name, candidates, origin) → OsmPlace|null` (similaridade ≥ 0,55, desempate pela distância).
  - `createPlacesService(deps: {google: GooglePlaces|null; osm: Osm; findExisting: (by: {googlePlaceId?: string; osmRef?: string}) => Promise<string|null>}) → PlacesService` com `autocomplete(input) → AutocompleteResponse`, `resolve(input) → RestaurantDraft`, `live(placeId) → LivePlace` (lança `PlacesUnavailable` se sem Google).
  - `cache.ts`: `createTtlCache<V>(ttlMs, max)`; usado só para respostas do OSM (1 dia) e `link → place_id`.
  - `fixtures.ts`: respostas de exemplo do Google/Nominatim/Overpass e `fakeFetch(routes)` para testes e para o modo local offline.

- [ ] **Step 1: Write the failing tests** em `places.test.ts` (fetch falso, sem rede):
  - Google responde → `autocomplete` devolve `source: "google"` com `googlePlaceId`.
  - Google 429, Google sem chave (`google: null`) e Google timeout → `source: "osm"` com sugestões do Nominatim.
  - `resolve({googlePlaceId, query})`: Place Details só com field mask `location,formattedAddress` (assert no header); Overpass com 2 candidatos → escolhe o de nome parecido; `fields.name` vem do OSM, `source: "google+osm"`, `fields.googlePlaceId` preenchido, `osmAttribution: true`.
  - Sem candidato parecido → `source: "manual"`, `fields.name === query`, `lat/lng` = posição do Google (o pin que o usuário ajusta), sem telefone.
  - `findExisting` devolvendo id → `{existingId}` sem chamar o Overpass.
  - `parseMapsUrl` com `https://www.google.com/maps/place/Bar+do+Z%C3%A9/@-23.55,-46.63,17z/...` → `{name: "Bar do Zé", lat: -23.55, lng: -46.63}`; com `?q=-23.5,-46.6` → coordenadas; com `https://exemplo.com/x` → `null`.
  - `expandMapsUrl` recusa redirecionamento para host fora da lista.
  - `nameSimilarity("Restaurante Bar do Zé", "bar do ze") ≥ 0.9`; `nameSimilarity("Sushi Leblon", "Padaria Real") < 0.3`.
  - Nominatim: duas buscas seguidas respeitam 1 s entre si (relógio falso).
- [ ] **Step 2:** `pnpm --filter @pap/api test -- places` → FAIL.
- [ ] **Step 3:** Implementar os módulos. Timeout padrão 4 s (Google) e 8 s (OSM) com `AbortSignal.timeout`.
- [ ] **Step 4:** testes → PASS.
- [ ] **Step 5: Commit** `git commit -m "Plates: busca de lugares com Google, OpenStreetMap e link do Maps"`

### Task 4: Rotas de lugares, env e README

**Files:**
- Create: `apps/api/src/routes/places.ts`
- Modify: `apps/api/src/types.ts` (`AppDeps.places: PlacesService`), `apps/api/src/app.ts` (montar rotas; rate limit próprio: 60/min por usuário para `/places/*`, 10/min para `/places/*/live`), `apps/api/src/env.ts` (`GOOGLE_PLACES_API_KEY` opcional), `apps/api/src/index.ts`, `apps/api/src/testing.ts` (places falso por padrão), `apps/api/.env.example`, `README.md` (cotas: Autocomplete, Place Details Essentials, Text Search IDs Only, Place Details Enterprise só no painel; atribuições)
- Test: `apps/api/src/routes/places.test.ts`

**Interfaces:**
- Consumes: `createPlacesService` (Task 3); schemas `autocompleteQuerySchema`, `placeResolveSchema` (Task 1).
- Produces: `GET /v1/places/autocomplete` → `AutocompleteResponse`; `POST /v1/places/resolve` → `RestaurantDraft`; `GET /v1/places/:googlePlaceId/live` → `LivePlace` | 503 `{code: "google_unavailable"}`; link não reconhecido → 400 `{code: "invalid_maps_url"}`.

- [ ] **Step 1: Write the failing tests:** sem token → 401; `q` com 1 letra → 400; resolve com `mapsUrl` inválida → 400 `invalid_maps_url`; live sem Google → 503; 11ª chamada de live no minuto → 429.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** `pnpm --filter @pap/api test` → PASS (47 antigos + novos).
- [ ] **Step 5: Commit** `git commit -m "Plates: rotas de busca de lugares e chave do Google na API"`

### Task 5: Restaurantes e fotos na API

**Files:**
- Create: `apps/api/src/routes/restaurants.ts`, `apps/api/src/plates/queries.ts` (consultas de leitura reaproveitadas: summary, detail, map pins), `apps/api/src/plates/cursor.ts`
- Modify: `apps/api/src/app.ts`, `apps/api/src/routes/profiles.ts` (assinatura de upload para `restaurant|visit|dish` com miniatura: caminho `${folder}/${userId}/${uuid}.webp` + `thumbPathOf`)
- Test: `apps/api/src/routes/restaurants.test.ts`

**Interfaces:**
- Consumes: tabelas (Task 2), schemas/tipos/`thumbPathOf` (Task 1), `withUser`, `MediaStorage`.
- Produces: `POST /v1/restaurants` (`RestaurantInput` + `destination: "fomos"|"quero-ir"` + `wishlist?: WishlistInput` + `visit?: VisitInput`) → 201 `{id}`; duplicado → 409 `{code: "restaurant_exists", fields: {id}}`; `GET /v1/restaurants` (`restaurantListQuerySchema`) → `Page<RestaurantSummary>` (só restaurantes com visita ou quero ir do usuário); `GET /v1/restaurants/map` → `{pins: MapPin[]}`; `GET /v1/restaurants/:id` → `RestaurantDetail`; `PATCH /v1/restaurants/:id` (`restaurantPatchSchema`) → `RestaurantDetail` | 403 `{code: "forbidden"}`; `DELETE /v1/restaurants/:id` → 204 (só quem pode editar; remove arquivos do Storage); `POST /v1/restaurants/:id/photos` `{path}` → `Photo`; `DELETE /v1/restaurants/:id/photos/:photoId` → 204. Caminhos de foto aceitos só se começarem por `restaurants/${userId}/`.

- [ ] **Step 1: Write the failing tests:** criar com `destination: "fomos"` cria visita de hoje; com `"quero-ir"` cria item com prioridade; lista de BIA não traz restaurantes só de ANA; filtro `cuisine=japanese`, `area` (bairro e cidade), `minRating=4` e `sort=nota` funcionam; paginação com `limit=2` devolve `nextCursor` e a segunda página sem repetir; BIA `PATCH` → 403; ANA `DELETE` → 204 e `h.removed` contém foto e miniatura; `coverPath` de outro usuário → 400; `place_id` repetido → 409 com `fields.id`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5: Commit** `git commit -m "Plates: CRUD de restaurantes, fotos, lista com filtros e pins do mapa"`

### Task 6: Visitas, pratos, avaliações e quero ir na API

**Files:**
- Create: `apps/api/src/routes/visits.ts`, `apps/api/src/routes/dishes.ts`, `apps/api/src/routes/ratings.ts`, `apps/api/src/routes/wishlist.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/src/routes/plates-flow.test.ts`

**Interfaces:**
- Produces: `POST /v1/restaurants/:id/visits` (`VisitInput`) → `Visit`; `PATCH|DELETE /v1/visits/:id`; `POST /v1/restaurants/:id/dishes` (`DishInput`) → `Dish` (só quem edita); `PATCH|DELETE /v1/dishes/:id`; `PUT /v1/restaurants/:id/rating` (`RestaurantRatingInput`) → `RestaurantRating` (upsert); `DELETE /v1/restaurants/:id/rating`; `PUT /v1/dishes/:id/rating` (`DishRatingInput`) → `DishRating`; `DELETE /v1/dishes/:id/rating`; `PUT /v1/restaurants/:id/wishlist` (`WishlistInput`) → item; `DELETE /v1/restaurants/:id/wishlist`; `POST /v1/restaurants/:id/fomos` (`fomosInputSchema`) → `{visit: Visit}` (cria a visita e remove do quero ir, na mesma transação).

- [ ] **Step 1: Write the failing tests** (fluxo completo): visita com `dishIds` de outro restaurante → 400; BIA cria prato em restaurante de ANA → 403; BIA avalia prato de ANA → 200 e o `GET` do restaurante (como BIA) mostra `myRating` dela e `score` só com notas visíveis a ela; nota privada de ANA não entra no `score` visto por BIA; `PUT rating` duas vezes atualiza em vez de duplicar e `overall` 4,25 → 4,5; `fomos` cria visita e o item some de `status=quero-ir`; `fomos` sem estar no quero ir → 409 `not_in_wishlist`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5: Commit** `git commit -m "Plates: visitas, pratos, avaliações e quero ir na API"`

### Task 7: Modo local e seed com dados de exemplo

**Files:**
- Create: `apps/api/src/dev/plates-demo.ts` (`seedPlatesDemo(db, users: {ana: string; bia: string}): Promise<void>` — 6 restaurantes reais de São Paulo com coordenadas, visitas, pratos, notas e 2 itens de quero ir; fotos ausentes → arte vazia do site)
- Modify: `apps/api/src/dev/local.ts` (places com `google: null` e OSM real; flag `PAP_OFFLINE=1` usa `fakeFetch` das fixtures), `apps/api/src/dev/seed.ts`, `README.md` (modo local de Plates)

- [ ] **Step 1:** `pnpm dev:local`; `curl` com token da ana em `/v1/restaurants` → 6 itens; `PAP_OFFLINE=1` + autocomplete "sushi" → sugestões das fixtures.
- [ ] **Step 2: Commit** `git commit -m "Plates: dados de exemplo no modo local e no seed"`

### Task 8: Camada de dados do site

**Files:**
- Create: `apps/web/src/lib/plates/keys.ts`, `apps/web/src/lib/plates/queries.ts`, `apps/web/src/lib/plates/mutations.ts`, `apps/web/src/lib/plates/upload.ts`, `apps/web/src/lib/plates/filters.ts`
- Modify: `apps/web/package.json` (`@tanstack/react-virtual`, `maplibre-gl` — versões publicadas há mais de 1 dia)

**Interfaces:**
- Produces: `platesKeys` (`all`, `list(filters)`, `detail(id)`, `map`, `autocomplete(q)`); `useRestaurants(filters)` (infinite), `useRestaurant(id)`, `useMapPins()`, `useAutocomplete(q, session)` (debounce 250 ms, `enabled` com ≥2 caracteres), `resolvePlace(input)`, `useLivePlace(placeId, enabled)`; mutações com update otimista no detalhe e invalidação da lista: `useCreateRestaurant`, `useUpdateRestaurant`, `useDeleteRestaurant`, `useAddVisit`, `useAddDish`, `useRateRestaurant`, `useRateDish`, `useSetWishlist`, `useFomos`; `uploadPlatesPhoto(kind: "restaurant"|"visit"|"dish", file): Promise<string>` (comprime `photo` + `thumb`, sobe os dois); `filtersFromSearchParams(sp)` / `filtersToSearchParams(f)` (filtros na URL).

- [ ] **Step 1:** `pnpm --filter @pap/web typecheck && pnpm --filter @pap/web lint` → PASS.
- [ ] **Step 2: Commit** `git commit -m "Plates: camada de dados do site"`

### Task 9: Desenho das telas (impeccable)

- [ ] **Step 1:** Rodar `impeccable context --target apps/web/src/components/plates` e seguir `reference/shape.md` dentro da direção já registrada em `apps/web/DESIGN.md` e `.impeccable/surfaces/src-app.md` (refinamento do mundo existente, não redesenho). Telas: caderno (grid/lista/filtros), página do restaurante, cadastro (busca + rascunho), folha de visita/avaliação/prato, quero ir, mapa. Decidir: card em arco do caderno, carimbo da nota, folha de avaliação com os 4 critérios, pin carimbado do mapa, estado vazio de cada tela.
- [ ] **Step 2:** Registrar as decisões novas na surface brief `.impeccable/surfaces/` correspondente.

### Task 10: Caderno, navegação e quero ir

**Files:**
- Create: `apps/web/src/components/plates/notebook.tsx`, `restaurant-card.tsx`, `restaurant-row.tsx`, `filters-bar.tsx`, `wishlist-list.tsx`, `empty-notebook.tsx`; rotas `apps/web/src/app/plates/(app)/quero-ir/page.tsx`
- Modify: `apps/web/src/app/plates/(app)/page.tsx` (usa `Notebook` no lugar de `PlatesHome`), `apps/web/src/components/shell/nav.tsx` (Plates: Caderno, Mapa, +, Quero ir, Perfil; Plots mantém o atual), remover `components/home/plates-home.tsx`

- [ ] **Step 1:** Implementar com `useRestaurants`, grid ↔ lista, filtros na URL, ordenação, animação de layout (Motion `layout`) e virtualização (TanStack Virtual) a partir de 40 itens; skeletons; estado vazio com CTA para "+".
- [ ] **Step 2:** Verificar no Chromium local (modo local, ana): 6 cards, filtro "Japonesa" reduz a lista com animação, lista ↔ grid, sem rolagem horizontal em 390 px.
- [ ] **Step 3: Commit** `git commit -m "Plates: caderno com filtros, ordenação e quero ir"`

### Task 11: Cadastro de restaurante

**Files:**
- Create: `apps/web/src/app/plates/(app)/novo/page.tsx`, `apps/web/src/components/plates/place-search.tsx`, `restaurant-form.tsx`, `pin-picker.tsx` (MapLibre carregado com `next/dynamic`, `ssr: false`), `attribution.tsx`

- [ ] **Step 1:** Busca com sugestões (selo "Google" quando `source: "google"`; aviso discreto quando caiu no OSM), colar link do Maps detectado pelo formato, opção "Cadastrar à mão"; `resolvePlace` → se `existingId`, ir para a página dele; senão formulário com o rascunho, fotos (upload com miniatura), pin arrastável e escolha "Já fomos" (abre a folha de avaliação) / "Quero ir" (motivo + prioridade). Novo `session` UUID a cada cadastro.
- [ ] **Step 2:** Verificar no Chromium: cadastro manual completo; com `PAP_OFFLINE=1`, busca "sushi" → rascunho preenchido pelo OSM com atribuição; restaurante já existente redireciona.
- [ ] **Step 3: Commit** `git commit -m "Plates: cadastro de restaurante com busca, link do Maps e manual"`

### Task 12: Página do restaurante, visitas, pratos e avaliações

**Files:**
- Create: rota `apps/web/src/app/plates/(app)/r/[id]/page.tsx` (+ `editar/page.tsx`), `apps/web/src/components/plates/restaurant-page.tsx`, `rating-sheet.tsx` (4 critérios + review + privada), `visit-sheet.tsx`, `dish-sheet.tsx`, `dish-rating-sheet.tsx`, `dish-ranking.tsx`, `visit-timeline.tsx`, `google-live-panel.tsx`, `fomos-button.tsx`

- [ ] **Step 1:** Ler `apps/web/node_modules/next/dist/docs/` sobre rotas dinâmicas com `cacheComponents` e escolher a forma de ler `id` (casca estática + `useParams` em `Suspense`, como as demais páginas logadas).
- [ ] **Step 2:** Implementar: topo com foto em arco e carimbo da nota (transição de elemento compartilhado a partir do card, via `document.startViewTransition` como em `lib/transition-router.tsx`), critérios, ranking de pratos, linha do tempo de visitas, painel "Ver no Google" sob demanda com atribuição, ações só para quem pode editar (`canEdit`), "Fomos!" com microinteração (mola) quando estiver no quero ir. UI otimista nas notas.
- [ ] **Step 3:** Verificar no Chromium: avaliar só "comida" → carimbo mostra a nota; avaliar os 4 → nota geral confere com `overallFromCriteria`; nova visita com 2 pratos; nota de prato reordena o ranking; bia não vê "Editar" no restaurante da ana; "Fomos!" tira o item do quero ir e abre a avaliação; teclado navega as estrelas.
- [ ] **Step 4: Commit** `git commit -m "Plates: página do restaurante com visitas, pratos e avaliações"`

### Task 13: Mapa

**Files:**
- Create: rota `apps/web/src/app/plates/(app)/mapa/page.tsx`, `apps/web/src/components/plates/plates-map.tsx`, `map-style.ts` (estilo OpenFreeMap "positron" com cores do papel creme), `map-card.tsx`

- [ ] **Step 1:** MapLibre com fonte GeoJSON de `useMapPins` e `cluster: true`; dois estilos de pin (fomos = carimbo terracota com a nota; quero ir = oliva vazado); toque no cluster aproxima; toque no pin abre `map-card` com link para a página; atribuição OpenFreeMap + "© colaboradores do OpenStreetMap"; botão "perto de mim" com geolocalização opcional.
- [ ] **Step 2:** Verificar no Chromium: 6 pins, cluster ao afastar, card abre, bundle de `/plates` sem `maplibre-gl` (conferir `.next` / `next build` output).
- [ ] **Step 3: Commit** `git commit -m "Plates: mapa com pins e clusters"`

### Task 14: Verificação final da fase

- [ ] **Step 1:** `pnpm turbo run typecheck lint test build` → todas as tarefas OK.
- [ ] **Step 2:** Rodada no Chromium (desktop + 390 px, CPU 4x): fluxo completo dos Steps de verificação das Tasks 10–13, `prefers-reduced-motion`, sem erro no console.
- [ ] **Step 3:** Detector do impeccable nas telas novas e revisão final (impeccable finish reviewer) contra a direção; corrigir em um lote.
- [ ] **Step 4:** Atualizar `README.md` (estado atual: fase 2; rotas de Plates; cotas) e `apps/web/DESIGN.md` com os componentes novos.
- [ ] **Step 5: Commit** e pedir ao usuário autorização para o push (a Railway aplica as migrations ao iniciar).
