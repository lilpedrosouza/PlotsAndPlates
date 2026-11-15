# Fase 6: performance e animação

Relatório da passada final de performance e animação do PAP (spec em
`docs/superpowers/specs/2026-11-15-fase-6-performance-design.md`).

Metas do projeto: **Lighthouse mobile ≥ 90, LCP < 2,5 s, INP < 200 ms,
CLS < 0,1**, com animações fluidas e a CPU 4x mais lenta (Android
intermediário).

## Como foi medido

- **Lighthouse 12.8.2**, preset mobile padrão: Moto G Power simulado, CPU 4x,
  rede 4G lenta simulada. O cache é limpo a cada rodada, e cada tela é medida
  **3 vezes**, com a mediana na tabela. Telas logadas usam as contas de teste.
  `/entrar` e `/` são medidas num navegador sem sessão. Antes de medir, as
  conquistas já ganhas são marcadas como vistas (senão o aviso vira o maior
  elemento da tela).
- **Interações**, com Chromium nesta máquina, CPU 4x (DevTools) e tela de
  celular com toque:
  - latência de cada toque, pela Event Timing API, a mesma base do INP;
  - intervalos entre quadros (`requestAnimationFrame`) durante a animação.
- **Produção:** Vercel (site) + Railway (API) + Supabase. **Local:** build de
  produção do site (`next start`) + API local com dados de exemplo, usado para
  medir cada correção sem mexer em produção.
- Roteiros versionados em [`scripts/perf/`](../../scripts/perf/README.md).
  Resumos em [`data/`](data/). Relatórios HTML do Lighthouse (rodada mediana)
  em [`lighthouse/`](lighthouse/).

Ressalvas:
- O LCP do Lighthouse mobile é **simulado**. O programa grava a página numa
  rede rápida e recalcula como ela seria numa rede 4G lenta, somando tudo o
  que foi pedido antes do maior elemento aparecer.
- Na medição real do navegador, o maior elemento das telas de lista aparece
  junto com o primeiro paint (~150 ms localmente).
- A nota oscila uns ±5 pontos entre rodadas nesta máquina. Por isso vale a
  mediana de 3.

## Produção: antes × depois

Antes: commit `55b251c` (fase 5). Depois: _medição após o deploy da fase 6
(preenchida no fechamento)._

<!-- PROD-DEPOIS -->

## Build local: antes × depois

Mesmos dados de exemplo e mesma máquina, antes (`63dbb84`) e depois das
correções.

| Tela | Nota antes | Nota depois | LCP antes | LCP depois | TBT antes | TBT depois | CLS antes | CLS depois |
|---|---|---|---|---|---|---|---|---|
| porta-entrar | 96 | **98** | 2,8 s | 2,4 s | 53 ms | 53 ms | 0 | 0 |
| raiz | 84 | **95** | 4,2 s | 2,9 s | 130 ms | 81 ms | 0 | 0 |
| plates-caderno | 71 | **88** | 5,4 s | 3,5 s | 391 ms | 245 ms | 0 | 0 |
| plates-quero-ir | 71 | **89** | 5,2 s | 3,5 s | 407 ms | 180 ms | 0 | 0 |
| plates-restaurante | 69 | **74** | 5,8 s | 5,7 s | 412 ms | 265 ms | 0 | 0 |
| plates-perfil | 51 | **74** | 5,6 s | 5,5 s | 345 ms | 264 ms | 0,48 | 0 |
| plates-pessoas | 77 | **95** | 5,1 s | 2,9 s | 249 ms | 56 ms | 0 | 0 |
| plates-mapa | 49 | **60** | 5,2 s | 3,3 s | 2694 ms | 3497 ms | 0,016 | 0,016 |
| plots-diario | 72 | **89** | 5,2 s | 3,4 s | 329 ms | 189 ms | 0,073 | 0 |
| plots-quero-ver | 72 | **90** | 5,2 s | 3,5 s | 361 ms | 139 ms | 0,007 | 0,005 |
| plots-titulo | 67 | **73** | 6,0 s | 5,2 s | 446 ms | 309 ms | 0 | 0 |
| plots-perfil | 71 | **85** | 5,2 s | 3,0 s | 390 ms | 374 ms | 0,013 | 0 |
| plots-buscar | 77 | **96** | 5,1 s | 2,5 s | 237 ms | 130 ms | 0 | 0 |
| wrapped | 74 | **80** | 5,6 s | 5,2 s | 273 ms | 135 ms | 0 | 0 |

## Interações com a CPU 4x (build local)

| Interação | INP antes | INP depois | Quadros > 50 ms antes | depois | Mediana dos quadros depois |
|---|---|---|---|---|---|
| trocar-mundo | 80 ms | 72 ms | 4 | 4 | 16,7 ms |
| abrir-ficha | 72 ms | 72 ms | 3 | 3 | 16,7 ms |
| registrar-visita | 184 ms | 168 ms | 1 | 1 | 16,7 ms |
| avaliar | 48 ms | 56 ms | 0 | 0 | 16,7 ms |
| carimbo-fomos | 184–264 ms | 40–48 ms | 4 | 4 | 16,7 ms |
| registrar-sessao | 184 ms | 40 ms | 1 | 1 | 16,7 ms |
| reordenar-lista | 64 ms | 32 ms | 0 | 0 | 16,7 ms |
| sorteio | 88 ms | 80 ms | 0 | 0 | 16,7 ms |
| stories-avancar | 104 ms | 120 ms | 1 | 1 | 16,7 ms |
| stories-segurar | 24 ms | 32 ms | 0 | 0 | 16,7 ms |
| busca-tmdb | 56 ms | 64 ms | 1 | 1 | 16,7 ms |
| aviso-conquista | – | – | 0 | 0 | 16,7 ms |

- Todas as interações ficam **abaixo de 200 ms**.
- Os quadros acima de 50 ms que sobram aparecem enquanto o React monta a tela
  nova numa navegação (trocar de mundo, abrir a ficha, o "Fomos!" levando à
  ficha) ou uma folha.
- As animações dessas trocas, as View Transitions e as folhas, são CSS só de
  `transform` e `opacity`. Elas rodam no compositor e não esperam a thread
  principal.
- Na busca local, os títulos de exemplo não têm pôster e mostram arte em SVG.

## O que mudou

**Carregamento**
- **Casca primeiro:** o porteiro do app não esconde mais a página. Título,
  abas e cabeçalho vão no HTML do servidor, e só o que depende de dados mostra
  esqueleto, no tamanho do que vai chegar. Esta era a maior causa do LCP
  logado de 4–6 s.
- **Raiz:** `/` virou um HTML mínimo, sem React, que lê a sessão e o último
  mundo e redireciona. Com `?code=`, vai para o callback de login.
- **Primeira carga mais leve** (gzip, sem o pacote de navegadores antigos):
  `/plates` 384 → 233 KB e `/plots` 345 → 212 KB.
  - Saiu o **zod**: as constantes do `@pap/shared` foram para arquivos sem
    schema.
  - Saiu o **supabase-js**: a sessão guardada é lida direto, e o cliente chega
    depois para renovar o token, entrar e sair.
  - As **folhas** de filtros, de sorteio e de registro só são baixadas quando
    alguém abre.
- **Fontes:** Besley e a letra miúda vêm só no peso usado, e as fontes
  pré-carregadas caíram de ~142 KB para ~102 KB.

**Estabilidade e mídia**
- **CLS:**
  - O bilhete do Wrapped e a grade de conquistas reservam o próprio espaço.
  - O conteúdo do Plots ocupa ao menos uma tela, para o rodapé do TMDB não
    pular (era o 0,189 do diário e do título em produção).
- **Imagens:**
  - `preconnect` para a API e para o TMDB.
  - O fundo do detalhe de título vem no tamanho da tela.

**Toques e animação**
- **Toques:**
  - As folhas de visita, nota e registro abrem numa transição do React.
  - O "Fomos!" mostra "ocupado" na hora e faz o resto depois da pintura.
  - Botões e etiquetas encolhem ao apertar em CSS. O `whileTap` do Motion
    atrasava a apresentação do quadro do toque em até ~180 ms.
- **Estrelas:** a nota sai da estrela tocada. Antes vinha da largura da caixa,
  que esticava: no celular era preciso tocar à direita da estrela.
- **Pendências da fase 5:**
  - Segurar o story não fica preso quando o sistema cancela o toque.
  - O aviso de conquista espera o Wrapped fechar e não volta ao trocar de
    mundo.

**API**
- **Conquistas:**
  - `GET /me/achievements` não grava nada quando não há novidade.
  - Depois de uma ação, o par é procurado uma vez, não quatro.
  - Índice novo em `visits.together_with` (migration 0015).

## Exceções e limites

<!-- TRIAGEM -->

- **Mapa (exceção autorizada na spec):** o `maplibre-gl` sozinho gasta ~1,5 s
  de script com a CPU 4x (TBT ~3 s). A nota subiu de 49 para 60–66 sem trocar
  a biblioteca.
- **Telas cujo maior elemento depende de dados** (restaurante, título, perfil
  do Plates, Wrapped): o nome, a capa ou o número só existem depois de:
  1. ~1 s de JavaScript do React com a CPU 4x;
  2. a leitura da sessão;
  3. a ida e volta à API.
  
  Esse é o custo estrutural da abordagem escolhida (sessão no navegador). A
  próxima etapa possível é a abordagem C da spec, com sessão em cookie e o
  servidor montando essas telas com os dados.
- **Atalho de API pelo mesmo domínio da Vercel:** não adotado. O critério da
  spec exige provar que a API continua vendo o IP real do visitante, e isso só
  dá para verificar mudando a configuração de produção.

## Como repetir

Veja [`scripts/perf/README.md`](../../scripts/perf/README.md). Verificações de
regressão (passa/falha) em `scripts/perf/checks/`:
- `casca`: a casca aparece primeiro e os redirecionamentos continuam certos;
- `raiz`: o redirecionamento da raiz;
- `login`: entrar sem recarregar a página;
- `cls`;
- `js`: sem zod nem supabase-js na primeira carga;
- `mapa`;
- `estrelas`;
- `animacao`.
