# Fase 4 — Casal, perfis e comunidade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vínculo de casal por convite, "juntos" nos dois mundos, notas lado a lado com média do casal, listas de vontade do casal, busca e perfil público, e "O que o pessoal do PAP achou".

**Architecture:** Padrões das fases 2 e 3. Casal em `packages/db/src/schema/couples.ts` + função `public.partner_of(uid)`; policies existentes recriadas numa migration custom para incluir o par. API: `apps/api/src/couples/` (queries de par) e rotas `couple.ts`, `community.ts`, `public-profiles.ts`; ajustes nas rotas de Plates e Plots. Site: `apps/web/src/lib/couple/`, componentes em `components/couple/`, `components/people/`, e ajustes nas telas de Plates e Plots.

**Tech Stack:** igual às fases 2 e 3.

**Spec:** `docs/superpowers/specs/2026-11-14-fase-4-casal-comunidade-design.md`

## Global Constraints

- Cada pessoa em no máximo um casal; casal só nasce do aceite; desfazer não apaga dados.
- Privado = dono e par; terceiros e perfil público/comunidade só veem o que é público.
- "Juntos": Plates = visita única visível/editável pelos dois; Plots = registro espelhado do par (mesmo `group_id`, sem nota).
- Listas do casal = união das linhas dos dois; Fomos!/Assistimos!/tirar remove dos dois; desfazer → cada um vê o que adicionou.
- Média do casal com `coupleRating`; comunidade com `communityRating` e `countsForCommunity` (sem você, sem par, sem privadas).
- RLS + `GRANT` explícito em toda tabela nova; telas com a skill `impeccable`; lições das fases anteriores (Suspense para `usePathname` em rotas dinâmicas, consultas sem RLS fora da transação nos testes, `patchOf`).

## Review Focus

1. **Convidar quem já tem par, a si mesmo, ou aceitar convite depois que um dos dois já virou par de outra pessoa** → 409/400 e nenhum casal com 3 pessoas (testes na Task 3).
2. **Desfazer o vínculo** → visitas "juntos" ficam só com quem registrou, registros espelhados ficam com cada um, listas voltam para quem adicionou, ninguém perde nada (teste na Task 3).
3. **Avaliação privada** → visível ao par, invisível a terceiros, fora do perfil público e da comunidade (testes nas Tasks 2 e 6).
4. **Par apagando visita "juntos" registrada pelo outro** → só sai do caderno dele (teste na Task 4).
5. **Item que os dois adicionaram ao quero ir/ver** → aparece uma vez com "pelos dois"; Fomos!/Assistimos! tira as duas linhas (testes nas Tasks 4 e 5).

---

### Task 1: Domínio do casal no shared
`packages/shared/src/couple/{schemas,types,index}.ts` + testes. Produz: `inviteInputSchema` ({username}), `CoupleState` ({partner: PublicProfile|null; since; outgoing: Invite[]; incoming: Invite[]}), `Invite`, `PersonRef` ({id, username, displayName, avatarUrl}), `SideBySide` ({mine, partner, couple}), `CommunityReview`, `CommunityPage`, `PublicPlatesProfile`, `PublicPlotsProfile`; campos novos: `Visit.together`, `Visit.registeredBy: PersonRef|null`, `RestaurantDetail.partnerRating`, `RestaurantDetail.partner: PersonRef|null`, `DishWithScore.partnerRating`, `RestaurantSummary.wishlist.addedBy: PersonRef[]`, `WatchLog.together`, `TitleDetail.partnerRating`, `SeasonInfo.partnerRating`, `TitleDetail.partner`, `WatchlistItem.addedBy`; `visitInputSchema.together` e `logInputSchema.together` opcionais. Commit "Casal: domínio no shared".

### Task 2: Tabelas e permissões do casal
`packages/db/src/schema/couples.ts` (`coupleMembers`, `coupleInvites`), `watch_logs.group_id`, migration custom com `partner_of`, `can_edit_restaurant` com par e as policies recriadas (visits/visit_photos/visit_dishes com par em "juntos"; notas e registros privados visíveis ao par; wishlist/watchlist lidas e apagadas pelo par; custom_lists/list_items privadas visíveis ao par). Testes RLS: privado visível ao par e não a terceiro; visita juntos visível e editável pelo par, não a dele separada; wishlist do par visível e apagável; par edita restaurante do outro. Commit.

### Task 3: Convites e vínculo na API
`apps/api/src/routes/couple.ts`, `apps/api/src/couples/partner.ts` (`partnerOf(tx, userId)`, `personRef`). Rotas da spec. Testes: convidar, aceitar (recusa outros pendentes), recusar, cancelar, convidar quem tem par 409, a si mesmo 400, username inexistente 404, convite duplicado 409, aceitar quando já tem par 409, desfazer mantém dados. Commit.

### Task 4: Plates com o par
Visitas com `together` (padrão: verdadeiro se houver par), caderno e pins incluem restaurantes de visitas "juntos" do par e do quero ir do par; detalhe com nota do par e do casal, pratos com notas dos dois; apagar visita do par = desmarcar juntos; quero ir do casal (`addedBy`), Fomos! remove as linhas dos dois. Testes de fluxo. Commit.

### Task 5: Plots com o par
Registro com `together` cria o espelho do par (mesma data/temporada, `group_id`); diário mostra "juntos"; detalhe com nota do par e do casal (título e temporadas); quero ver do casal com `addedBy`; Assistimos! remove dos dois e cria o espelho quando juntos. Testes. Commit.

### Task 6: Comunidade e perfis públicos
`GET /v1/restaurants/:id/community`, `GET /v1/titles/:id/community`, `GET /v1/profiles/:username/plates|plots`. Testes: comunidade sem você/par/privadas, média correta, paginação; perfil sem privadas, favoritos de maior nota pública, Top 4. Commit.

### Task 7: Camada de dados do site
`apps/web/src/lib/couple/*` (useCouple, mutações de convite), `lib/people/*` (busca, perfis, comunidade). Commit.

### Task 8: Desenho (impeccable)
Brief `apps/web/.impeccable/surfaces/src-app-casal.md`: bloco Par, aviso de convite, colunas você · par · casal, "adicionado por", pessoas e perfil público, comunidade. Commit.

### Task 9: Bloco Par e aviso de convite
Perfil (Plates e Plots) e aviso no caderno/diário. Navegador: Ana convida Bia, Bia aceita, desfaz. Commit.

### Task 10: Plates no site com o par
"Fomos juntos" na folha de visita, "registrada por", colunas do casal na tabela de notas e nos pratos, "adicionado por" no quero ir, "O que o pessoal do PAP achou". Navegador. Commit.

### Task 11: Plots no site com o par
"Vimos juntos" na folha, "juntos" no diário, selos você · par · casal, "adicionado por" no quero ver, comunidade. Navegador. Commit.

### Task 12: Pessoas e perfis públicos
`/plates/pessoas`, `/plots/pessoas`, `/plates/u/[username]`, `/plots/u/[username]` (Suspense + loading), link nos nomes da comunidade e no bloco Par. Navegador. Commit.

### Task 13: Verificação final
Checagem completa, navegador (celular e computador, CPU 4x, movimento reduzido), `impeccable detect`, DESIGN.md e README, revisão independente, correções Críticas/Importantes com teste, pedir autorização de merge/push.
