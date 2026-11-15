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

Antes: commit `55b251c` (fase 5), primeira visita. Depois: commit `2616fdc`,
como quem volta ao app: cada tela logada recebe uma visita antes das 3 rodadas.
O cache HTTP do navegador continua sendo limpo a cada rodada; o que fica é a
última versão das telas guardada no aparelho (ver "Telas abrem com a última
versão").

| Tela | Nota antes | Nota depois | LCP antes | LCP depois | TBT antes | TBT depois | CLS antes | CLS depois |
|---|---|---|---|---|---|---|---|---|
| porta-entrar | 95 | **99** | 2,7 s | 2,1 s | 105 ms | 68 ms | 0 | 0 |
| raiz | 84 | **95** | 3,6 s | 1,8 s | 300 ms | 220 ms | 0 | 0 |
| plates-caderno | 73 | **91** | 3,9 s | 2,1 s | 568 ms | 321 ms | 0 | 0 |
| plates-quero-ir | 74 | **91** | 3,9 s | 1,7 s | 528 ms | 355 ms | 0 | 0 |
| plates-restaurante | 69 | **88** | 4,4 s | 2,6 s | 596 ms | 376 ms | 0 | 0 |
| plates-perfil | 69 | **91** | 4,2 s | 2,7 s | 439 ms | 269 ms | 0,145 | 0 |
| plates-pessoas | 78 | **98** | 3,9 s | 1,8 s | 367 ms | 166 ms | 0 | 0 |
| plates-mapa | 53 | **70** | 4,2 s | 1,7 s | 2836 ms | 2751 ms | 0,016 | 0,016 |
| plots-diario | 61 | **98** | 4,4 s | 1,9 s | 548 ms | 151 ms | 0,189 | 0 |
| plots-quero-ver | 67 | **92** | 5,1 s | 2,9 s | 531 ms | 209 ms | 0,011 | 0 |
| plots-titulo | 51 | **79** | 5,7 s | 3,2 s | 780 ms | 575 ms | 0,189 | 0 |
| plots-perfil | 72 | **93** | 4,1 s | 1,5 s | 335 ms | 315 ms | 0,144 | 0 |
| plots-buscar | 76 | **97** | 4,4 s | 1,4 s | 346 ms | 181 ms | 0 | 0 |
| wrapped | 75 | **95** | 4,3 s | 2,1 s | 418 ms | 234 ms | 0 | 0 |

Relatórios HTML da rodada mediana em [`lighthouse/`](lighthouse/), comprimidos
(`gunzip arquivo.html.gz` e abrir no navegador).

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
- **Fontes:** Besley e a letra miúda vêm só no peso usado (na porta, a Jost
  também), e as fontes pré-carregadas caíram de ~142 KB para ~102 KB.
- **Telas abrem com a última versão (depois do primeiro deploy):** o cache do
  React Query fica no localStorage do aparelho, com a extensão oficial.
  - A tela abre com os dados da última visita e a API atualiza em seguida.
  - O cache é da conta da sessão e some ao sair.
  - Nunca são guardados buscas nem os dados ao vivo do Google (termos do
    Google Maps).
  - No quero ver, os três primeiros pôsteres da última visita são pedidos por
    um script mínimo no `<head>`, antes do app.

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
- **Escolher um restaurante no cadastro:**
  - O Overpass passou a ter espera escalonada entre os espelhos e prazo total
    de 3,5 s. Antes eram 8 s por servidor, um depois do outro: até 24 s com os
    três lotados, como no dia da medição.
  - Depois de uma falha, o Overpass fica de lado por 1 minuto.
  - Plano B pelo nome no Nominatim. Medido com os servidores reais e o
    Overpass fora do ar: 2,6–3,5 s.
- **Conquistas:**
  - `GET /me/achievements` não grava nada quando não há novidade.
  - Depois de uma ação, o par é procurado uma vez, não quatro.
  - Índice novo em `visits.together_with` (migration 0015).

## Triagem (regra do Pedro)

Telas do dia a dia, que precisam bater a meta:

| Tela | Nota | LCP | Situação |
|---|---|---|---|
| Porta | 99 | 2,1 s | meta batida |
| Raiz | 95 | 1,8 s | meta batida |
| Caderno | 91 | 2,1 s | meta batida |
| Quero ir | 91 | 1,7 s | meta batida |
| Diário | 98 | 1,9 s | meta batida |
| Quero ver | 92 | **2,9 s** | nota batida, LCP acima |

- **Quero ver:** o maior elemento é o primeiro pôster do TMDB, de ~35 KB.
  Mesmo pedido antes do app e com a lista vinda do aparelho, a rede 4G lenta
  simulada leva ~1,3 s para baixá-lo.
- **Fora do dia a dia, com nota ≥ 90:** pessoas, busca, perfis e Wrapped.
- **Fora do dia a dia, abaixo da meta:**
  - restaurante: 88, LCP 2,6 s;
  - título: 79, LCP 3,2 s, com TBT de 575 ms (página com muito conteúdo: temporadas, onde assistir, elenco);
  - mapa: exceção da spec.
- **INP e CLS:** dentro da meta em todas as telas.

## Exceções e limites

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
