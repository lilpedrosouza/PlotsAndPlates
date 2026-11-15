# Fase 6 — Passada final de performance e animação

Data: 2026-11-15. Estado: aprovada pelo Pedro em 2026-11-15.

## Intenção

O PAP é usado no celular pelo casal, em Android intermediário. O documento do
projeto fecha com uma passada de performance e animação, com o relatório
Lighthouse como prova. Metas (do documento, repetidas em `apps/web/PRODUCT.md`):

- Lighthouse mobile **≥ 90** em performance;
- **LCP < 2,5 s**, **INP < 200 ms**, **CLS < 0,1**;
- animações fluidas com a CPU desacelerada em **4x**; corrigir qualquer engasgo.

Sucesso é o relatório mostrar essas metas batidas nas telas principais, medidas
em produção (Vercel + Railway + Supabase), com antes e depois.

## Decisões do Pedro

- Medição das telas logadas **em produção, com conta de teste** (criadas em
  2026-11-15: `lighthouse_a` e `lighthouse_b`, ligadas como casal, com os
  restaurantes de exemplo do seed e 10 filmes + 4 temporadas reais do TMDB via
  API; senha só no scratchpad, nunca no repositório).
- Abordagem **A: medir e corrigir o que falhar**. Sem trava de Lighthouse no CI
  (abordagem B) e sem reescrever a autenticação para cookies e renderização no
  servidor (abordagem C).

## Abordagens consideradas

- **A (escolhida):** medir cerca de 14 telas em produção (mediana de 3
  rodadas), gravar interações com CPU 4x, corrigir o que fica abaixo da meta,
  relatório com antes/depois. Custo: tamanho só conhecido após medir — já
  medido abaixo.
- **B:** A + Lighthouse CI no GitHub a cada push com orçamento. Protege o
  futuro, custa configuração e pushes lentos. Descartada pelo Pedro.
- **C:** sessão em cookie e telas logadas montadas no servidor com dados. Maior
  ganho de LCP, mas reescreve a autenticação inteira numa passada final.
  Descartada; só volta à mesa se A não atingir as metas.

## Medição inicial (produção, commit 55b251c)

Lighthouse 12.8.2, preset mobile padrão (Moto G Power simulado, CPU 4x, 4G
lento simulado), cache do navegador limpo a cada rodada, mediana de 3.

| Tela | Nota | LCP | TBT | CLS |
|---|---|---|---|---|
| `/entrar` (sem sessão, CLI) | 95–96 | 2,7 s | ~100 ms | 0 |
| `/` (sem sessão, CLI) | 84 | 3,6 s | 300 ms | 0 |
| `/plates` caderno | 73 | 3,9 s | 568 ms | 0 |
| `/plates/quero-ir` | 74 | 3,9 s | 528 ms | 0 |
| `/plates/r/[id]` | 69 | 4,4 s | 596 ms | 0 |
| `/plates/perfil` | 69 | 4,2 s | 439 ms | 0,145 |
| `/plates/pessoas` | 78 | 3,9 s | 367 ms | 0 |
| `/plates/mapa` | 53 | 4,2 s | 2 836 ms | 0,016 |
| `/plots` diário | 61 | 4,4 s | 548 ms | 0,189 |
| `/plots/quero-ver` | 67 | 5,1 s | 531 ms | 0,011 |
| `/plots/t/[id]` | 51 | 5,7 s | 780 ms | 0,189 |
| `/plots/perfil` | 72 | 4,1 s | 335 ms | 0,144 |
| `/plots/buscar` | 76 | 4,4 s | 346 ms | 0 |
| `/plots/wrapped/2026` | 75 | 4,3 s | 418 ms | 0 |

Acessibilidade 98–100 e boas práticas 100 em todas.

(Na rodada logada, `/entrar` e `/` herdaram a sessão e redirecionaram; os
números delas vêm da CLI sem sessão. O roteiro corrigido mede as rotas
públicas num contexto sem sessão.)

## Diagnóstico

1. **O porteiro segura a tela inteira.** `components/shell/auth-gate.tsx`
   mostra um esqueleto até `auth.status === "in"` **e** `GET /v1/me` voltar.
   Só então a página monta e dispara as consultas. Cadeia: JS (~1 s de
   avaliação com CPU 4x) → `getSession` → preflight CORS + `/me` (~330 ms) →
   preflight + consultas da tela (~350 ms) → render. O elemento de LCP de quase
   todas as telas é um título de texto (`h1`/`p.font-display`) com 87% do LCP
   em "render delay". Isso explica ~3 s de cada LCP logado.
2. **Raiz `/` redireciona no cliente** (`components/auth/entry-redirect.tsx`):
   baixa e hidrata o app inteiro para depois trocar de URL.
3. **Preflight CORS por URL.** A API está em outra origem
   (`papapi-production.up.railway.app`); `maxAge: 600` já está ligado, mas o
   cache de preflight é por URL, então cada consulta nova paga ~150 ms extra na
   primeira vez. As consultas da tela só começam depois de `/me`.
4. **CLS:**
   - Plots (diário, título): `<div class="pb-24 md:pb-4">`, causa "Media
     element lacking an explicit size" — pôster/imagem sem tamanho reservado.
   - Perfis: a seção de conquistas (`aria-labelledby="conquistas-titulo"`)
     entra e empurra o conteúdo (0,124 + 0,021).
5. **Mapa:** `maplibre-gl` gasta ~1,5 s de script e tarefas longas de até
   1,35 s; TBT 2,8 s.
6. **Detalhe de título:** o LCP é a imagem de fundo do TMDB, com 3,9 s de
   "load delay": a URL só existe depois dos dados.
7. **JS no caminho crítico:** `react-dom` (~1 s de avaliação, inevitável);
   `@supabase/supabase-js` (66 KB transferidos, 83% sem uso no carregamento);
   `zod` (37 KB, 68% sem uso — entra via `@pap/shared`, cujo único export é o
   barril `src/index.ts`, importado por 55 arquivos do web); `motion` (36 KB,
   64% sem uso). Tarefas longas de 200–360 ms no chunk do React Query quando os
   dados chegam (render de tudo de uma vez).
8. **`/entrar`:** LCP 2,7 s é o "Plots" gigante em `font-display`, sem
   animação; o atraso vem de CSS bloqueante (13 KB, ~300 ms estimados) e de
   quatro fontes de 27–41 KB pré-carregadas antes do JS.
9. **Artefato de teste:** nas contas novas, o aviso de conquista
   (`desbloqueio-titulo`) virou o LCP de algumas telas. Na vida real ele
   aparece uma vez. O roteiro marca as conquistas como vistas antes de medir.

## Correções (o que será construído)

### 1. Casca primeiro, dados depois (itens 1 e 3)
- `AuthGate` deixa de esconder a página: renderiza `children` já no HTML do
  servidor e na hidratação. Os textos fixos de cada tela (títulos, abas,
  cabeçalhos) aparecem no primeiro paint; o que depende de dados continua com o
  esqueleto próprio de cada componente.
- As consultas autenticadas já usam `enabled: auth.status === "in"` e não
  esperam `/me` (conferido em `lib/*/queries.ts`); o que as atrasa é o porteiro
  não montar a página. A mudança é tirar o bloqueio em `auth-gate.tsx` e tratar
  `me.data` indefinido nos 9 arquivos que chamam `useMe()`.
- Redirecionamentos continuam: sem sessão → `/entrar`; sem perfil →
  `/bem-vindo`. Quem não está logado pode ver a casca vazia por um instante
  antes de ir para `/entrar` — nenhum dado aparece, porque nada é buscado sem
  token. Erro de `/me` continua mostrando o aviso com "Tentar de novo".
- Componentes que hoje assumem `me.data` definido (o porteiro garantia) passam
  a tratar o "ainda carregando".

### 2. Raiz sem passar pelo React (item 2)
- `/` ganha um script inline mínimo, executado antes do React: se há sessão do
  Supabase no `localStorage` vai para o último mundo (`lastSection`), senão
  para `/entrar`, com `location.replace`. O componente atual fica como
  fallback (sem JS ou storage bloqueado).

### 3. Consultas mais cedo (item 3, 6)
- `preconnect` para a origem da API e para `image.tmdb.org` no `<head>`.
- Experimento medido: proxy de mesma origem (rewrite da Vercel `/api/*` → API
  na Railway) para eliminar preflights. **Só entra se** baixar o LCP mediano
  em ≥ 200 ms nas telas logadas e o rate limit da API continuar valendo por
  pessoa/IP real. Caso contrário, fica documentado no relatório como testado e
  descartado.

### 4. CLS (item 4)
- Pôsteres e imagens do Plots com tamanho/proporção reservados.
- Bloco de conquistas do perfil com esqueleto da mesma altura do conteúdo.
- Meta: CLS < 0,1 em todas as telas medidas.

### 5. Mapa (item 5)
- O mapa carrega depois do primeiro paint e da lista (import dinâmico de
  `maplibre-gl` disparado em `requestIdleCallback`/após o LCP), com o espaço do
  mapa reservado. Se ainda assim a nota ficar abaixo de 90 por causa do custo
  do próprio `maplibre-gl`, o relatório registra a exceção com o número real e
  o motivo — não se troca a biblioteca nesta fase.

### 6. Detalhe de título (item 6)
- A imagem de fundo usa `priority`/`fetchPriority="high"` e o tamanho certo do
  TMDB para mobile; com a correção 1 a URL chega ~2 s mais cedo.

### 7. JavaScript (item 7)
- `@pap/shared` ganha exports por subcaminho para que o web importe
  constantes/tipos sem puxar `zod` onde não valida nada; schemas `zod` ficam
  só nas telas que validam formulário. Medido pelo tamanho do JS da primeira
  carga do caderno (antes/depois no relatório).
- Rotas que não usam layout animado não devem carregar o pacote completo de
  `motion` no primeiro carregamento (já há `LazyMotion`; conferir quem puxa o
  resto).
- Tarefas longas quando os dados chegam: listas acima da dobra renderizam
  primeiro; o resto entra depois (virtualização já existe nas listas longas —
  conferir se está ativa nas telas medidas).

### 8. `/entrar` (item 8)
- LCP < 2,5 s: reduzir o que bloqueia o primeiro paint do cartaz (fontes
  pré-carregadas só as usadas acima da dobra; CSS crítico conforme o Next
  permitir). Meta é a nota ≥ 90 e LCP < 2,5 s; o caminho exato é do builder.

### 9. Animação e INP com CPU 4x
Roteiro Playwright com CPU 4x e INP medido via `web-vitals` (biblioteca só no
script de teste, não no app), cobrindo:
- trocar Plates ↔ Plots; abrir e fechar ficha/folha; registrar visita e sessão;
  carimbo de "fomos"; reordenar Top 4/lista; sorteio (embaralhar e virar);
  stories do Wrapped (avançar, segurar); aviso de conquista; busca do TMDB
  digitando.
- Critério: INP < 200 ms em cada interação; nenhum quadro acima de 50 ms
  durante animação (mediana ≤ 16,7 ms, como na fase 5). Qualquer engasgo vira
  correção.
- Pendências menores de animação da fase 5 entram aqui: `pointercancel` não
  limpa o timer de segurar nos stories; aviso de conquista que reabre ao trocar
  de mundo ou abre por baixo do Wrapped.

### 10. API: caminho quente das conquistas (pendência da fase 5)
- Índice em `visits.together_with`; `partnerOf` calculado uma vez por
  requisição; `GET /me/achievements` sem `INSERT` desnecessário quando nada
  novo destravou. Medido pelo tempo de resposta (antes/depois) no relatório.

## Relatório

- `docs/performance/fase-6.md`: metodologia, ambiente, tabela antes/depois por
  tela (nota, LCP, TBT, CLS), INP e quadros por interação com CPU 4x, tamanho
  de JS, exceções com motivo, como repetir.
- `docs/performance/lighthouse/*.html`: relatórios HTML da medição final (um
  por tela, rodada mediana).
- Roteiros versionados em `scripts/perf/` (Lighthouse logado e interações com
  CPU 4x), lendo e-mail/senha de variáveis de ambiente — nunca do repositório.

## Não-objetivos / anti-objetivos

- Não reescrever autenticação para cookies nem renderizar dados no servidor.
- Não trocar bibliotecas (maplibre, motion, supabase-js, react-query).
- Não mudar visual nem comportamento das telas além de: casca aparecer antes,
  espaço reservado para imagens/blocos, mapa entrando depois.
- Anti-objetivo: subir a nota escondendo conteúdo (ex.: atrasar o título para
  o LCP "não contar") ou desligando animações. Animações continuam; o que muda
  é custo.
- Não mexer em dados reais de ninguém; só nas contas de teste.

## Restrições

- Chaves só no servidor; nada de credencial no repositório ou no cliente.
- RLS e validação de JWT intocadas.
- `prefers-reduced-motion` continua respeitado.
- Testes atuais (shared 117, db 59, api 233) seguem verdes; typecheck, lint,
  build e `impeccable detect` sem regressão.

## Se a meta não fechar (decisão do Pedro)

Depois das correções 1–8, cada tela que ainda ficar com nota < 90 ou LCP
≥ 2,5 s é triada:

- **Não pode ficar abaixo da meta** — as telas do dia a dia (porta de entrada,
  raiz, caderno, quero ir, diário, quero ver) e qualquer tela onde o motivo
  seja corrigível dentro da abordagem A (render, imagem, JS, CLS, consulta
  lenta): revisar e melhorar até bater a meta.
- **Pode ficar abaixo, como exceção registrada** — quando o que falta é custo
  estrutural da abordagem A (≈1 s de React + leitura da sessão antes de buscar
  dados, imagem do TMDB que só existe depois dos dados, custo do
  `maplibre-gl`) e a tela não é do dia a dia. O relatório traz o número real, o
  motivo e o que resolveria (ex.: abordagem C).
- INP < 200 ms e CLS < 0,1 não têm exceção: valem em todas as telas.
- Nenhuma exceção esconde conteúdo ou desliga animação para subir a nota.

A abordagem C fica como próxima etapa opcional no relatório, não nesta fase.

## Onde medir durante o trabalho (decisão do Claude)

- **Durante a construção:** build de produção local (`next build && next
  start`) contra a API local (`pnpm dev:local`, dados de exemplo), com o mesmo
  Lighthouse mobile e a mesma CPU 4x. Serve para antes/depois relativos de cada
  correção, para o experimento do proxy (rewrite para a API local) e para os
  roteiros de interação, que gravam dados — assim nada é escrito em produção e
  a linha de base das contas de teste não muda. Nenhuma config de produção
  (`WEB_ORIGINS`, Supabase, Vercel) muda antes do merge.
- **Na produção:** só a linha de base (já feita) e a medição final depois do
  merge/deploy, que é a que vai para o relatório. A migration do índice (item
  10) sobe com o merge, como sempre (a API aplica na partida).
- "Telas principais" = as 14 da tabela.
- Quadros e INP são medidos no Chromium desta máquina com throttling de CPU 4x
  do DevTools; os números trazem essa ressalva no relatório.
- Rate limit com proxy: o experimento só é aprovado se `clientIp` continuar
  vendo o IP real do visitante atrás da Vercel; isso é verificado lendo o
  cabeçalho que a Vercel repassa, e na dúvida o proxy fica de fora.

## Deixado para o builder

- Ordem das correções e como provar cada uma (medida antes/depois).
- Detalhes do script inline da raiz e do formato do esqueleto por componente.
- Se o proxy de mesma origem entra (critério acima).

## Fim da fase

- Merge e push quando o Pedro autorizar; medição final em produção depois do
  deploy; relatório commitado com esses números.
- Perguntar ao Pedro se as contas `lighthouse_a`/`lighthouse_b` devem ser
  apagadas (com os dados delas) ou mantidas para medições futuras.
