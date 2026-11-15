---
name: PlotsAndPlates (PAP)
description: Diário a dois em dois mundos impressos, o rótulo de mercearia (Plates) e o cartaz de cinema (Plots).
colors:
  plates-bg: "#f3e9d6"
  plates-surface: "#fbf5e8"
  plates-sunken: "#e9dcc3"
  plates-ink: "#2b1d14"
  plates-ink-soft: "#6a5444"
  plates-rule: "#d6c7ab"
  plates-rule-strong: "#8c7a5c"
  plates-accent: "#a93f23"
  plates-second: "#555c2c"
  plates-danger: "#9b1c1c"
  plates-accent-mostarda: "#7c5a0a"
  plates-accent-vinho: "#7d2437"
  plates-accent-petroleo: "#1f5c63"
  plates-accent-ameixa: "#5e3a6b"
  plots-bg: "#0c0c0e"
  plots-surface: "#16171a"
  plots-sunken: "#1f2024"
  plots-ink: "#f2efe8"
  plots-ink-soft: "#a9a69d"
  plots-rule: "#2a2b30"
  plots-rule-strong: "#6b6d75"
  plots-accent: "#ffd60a"
  plots-danger: "#ff7a7a"
  plots-accent-terracota: "#ff7a52"
  plots-accent-oliva: "#c5e04a"
  plots-accent-vinho: "#ff5c8a"
  plots-accent-petroleo: "#40d9cc"
  plots-accent-ameixa: "#b99aff"
typography:
  plates-display:
    fontFamily: "Besley, Clarendon, Rockwell, Georgia, serif"
    fontSize: "clamp(2.25rem, 9vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.015em"
  plates-headline:
    fontFamily: "Besley, Clarendon, Rockwell, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  plates-title:
    fontFamily: "Besley, Clarendon, Rockwell, Georgia, serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  plates-body:
    fontFamily: "Sofia Sans, Segoe UI, Roboto, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.625
  plots-display:
    fontFamily: "Jost, Futura, Century Gothic, sans-serif"
    fontSize: "clamp(2.5rem, 11vw, 4.5rem)"
    fontWeight: 800
    lineHeight: 1.14
    letterSpacing: "-0.02em"
  plots-headline:
    fontFamily: "Jost, Futura, Century Gothic, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.14
    letterSpacing: "-0.02em"
  plots-title:
    fontFamily: "Jost, Futura, Century Gothic, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 800
    lineHeight: 1.14
    letterSpacing: "-0.02em"
  plots-body:
    fontFamily: "Jost, Futura, Century Gothic, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "0.005em"
  plots-button:
    fontFamily: "Jost, Futura, Century Gothic, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    letterSpacing: "0.08em"
  micro:
    fontFamily: "Sofia Sans Extra Condensed, Arial Narrow, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    letterSpacing: "0.09em"
    fontFeature: "tnum"
  micro-nav:
    fontFamily: "Sofia Sans Extra Condensed, Arial Narrow, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    letterSpacing: "0.09em"
  micro-sm:
    fontFamily: "Sofia Sans Extra Condensed, Arial Narrow, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.09em"
  micro-xs:
    fontFamily: "Sofia Sans Extra Condensed, Arial Narrow, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    letterSpacing: "0.09em"
  micro-xxs:
    fontFamily: "Sofia Sans Extra Condensed, Arial Narrow, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 600
    letterSpacing: "0.09em"
  plates-label-title:
    fontFamily: "Besley, Clarendon, Rockwell, Georgia, serif"
    fontSize: "1.1875rem"
    fontWeight: 700
    lineHeight: 1.15
  plates-label-title-sm:
    fontFamily: "Besley, Clarendon, Rockwell, Georgia, serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.15
  plates-label-title-lg:
    fontFamily: "Besley, Clarendon, Rockwell, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.15
  body-md:
    fontFamily: "Sofia Sans, Segoe UI, Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Sofia Sans, Segoe UI, Roboto, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  plates-xs: "1px"
  plates-sm: "2px"
  plates-md: "4px"
  plates-lg: "8px"
  plots-xs: "0px"
  plots-sm: "0px"
  plots-md: "2px"
  plots-lg: "2px"
  full: "999px"
spacing:
  plates-page: "1.25rem"
  plates-section: "2.75rem"
  plots-page: "1rem"
  plots-section: "2.25rem"
  control-md: "3rem"
  control-sm: "2.5rem"
  touch: "2.75rem"
components:
  button-primary-plates:
    backgroundColor: "{colors.plates-accent}"
    textColor: "{colors.plates-surface}"
    rounded: "{rounded.plates-md}"
    height: "{spacing.control-md}"
    padding: "0 1.25rem"
  button-primary-plots:
    backgroundColor: "{colors.plots-accent}"
    textColor: "{colors.plots-bg}"
    typography: "{typography.plots-button}"
    rounded: "{rounded.plots-md}"
    height: "{spacing.control-md}"
    padding: "0 1.25rem"
  button-secondary-plates:
    backgroundColor: "transparent"
    textColor: "{colors.plates-ink}"
    rounded: "{rounded.plates-md}"
    height: "{spacing.control-md}"
    padding: "0 1.25rem"
  button-secondary-plates-hover:
    backgroundColor: "{colors.plates-sunken}"
  button-secondary-plots:
    backgroundColor: "transparent"
    textColor: "{colors.plots-ink}"
    typography: "{typography.plots-button}"
    rounded: "{rounded.plots-md}"
    height: "{spacing.control-md}"
    padding: "0 1.25rem"
  button-secondary-plots-hover:
    backgroundColor: "{colors.plots-sunken}"
  chip-plates:
    backgroundColor: "transparent"
    textColor: "{colors.plates-ink}"
    rounded: "{rounded.plates-md}"
    height: "{spacing.control-sm}"
    padding: "0 0.875rem"
  chip-plates-pressed:
    backgroundColor: "{colors.plates-ink}"
    textColor: "{colors.plates-bg}"
  chip-plots:
    backgroundColor: "transparent"
    textColor: "{colors.plots-ink}"
    rounded: "{rounded.plots-md}"
    height: "{spacing.control-sm}"
    padding: "0 0.875rem"
  chip-plots-pressed:
    backgroundColor: "{colors.plots-ink}"
    textColor: "{colors.plots-bg}"
  field-plates:
    backgroundColor: "{colors.plates-surface}"
    textColor: "{colors.plates-ink}"
    rounded: "{rounded.plates-md}"
    height: "{spacing.control-md}"
    padding: "0 0.875rem"
  field-plots:
    backgroundColor: "{colors.plots-sunken}"
    textColor: "{colors.plots-ink}"
    rounded: "{rounded.plots-md}"
    height: "{spacing.control-md}"
    padding: "0 0.875rem"
  stamp-plates:
    backgroundColor: "transparent"
    textColor: "{colors.plates-accent}"
    rounded: "{rounded.full}"
    size: "4.5rem"
  stamp-plots:
    backgroundColor: "{colors.plots-accent}"
    textColor: "{colors.plots-bg}"
    rounded: "{rounded.plots-xs}"
    size: "4.5rem"
  section-switch-plates:
    backgroundColor: "{colors.plates-bg}"
    textColor: "{colors.plates-ink-soft}"
    typography: "{typography.micro}"
    rounded: "{rounded.plates-md}"
    height: "{spacing.touch}"
    padding: "3px"
  section-switch-plots:
    backgroundColor: "{colors.plots-bg}"
    textColor: "{colors.plots-ink-soft}"
    typography: "{typography.micro}"
    rounded: "{rounded.plots-md}"
    height: "{spacing.touch}"
    padding: "3px"
---

# Design System: PlotsAndPlates (PAP)

## Overview

**Creative North Star: "Rótulo & Cartaz"**

O PAP são dois cadernos impressos num app só. Plates é um rótulo de mercearia: papel creme, duas tintas e tinta café, Clarendon nos títulos, foto em arco, fio duplo e a nota carimbada torta. Plots é um cartaz de cinema: preto fosco, uma tinta luminosa, Futura em caixa alta, pôster de canto vivo e as notas escritas no bloco de créditos. Cada registro é uma frente impressa, e não um cartão com foto, nome e estrelas.

Os dois mundos usam os mesmos nomes de token (`--pap-*`) com valores próprios, escolhidos por `[data-theme="plates"]` ou `[data-theme="plots"]` no invólucro da seção. Cor, tipo, raio, sombra, curva e duração mudam juntos. O que atravessa os dois é pouco e deliberado: a letra miúda condensada, o número de catálogo (Nº 0012), a cor de destaque escolhida pela pessoa e a barra de navegação, que fica ancorada enquanto o mundo troca atrás dela.

A densidade é de celular usado com uma mão: uma coluna, controles de 44 a 48px de altura, a ação principal na cor de destaque e todo o resto em tinta e fio. O movimento tem o caráter do material: o papel assenta macio, com uma sobra leve; o cartaz corta seco.

**Key Characteristics:**
- Dois conjuntos completos de tokens sob os mesmos nomes; um componente serve aos dois mundos e muda de forma, não só de cor.
- Uma cor de destaque por pessoa, com um valor calibrado para cada mundo.
- Três vozes tipográficas por mundo: título (Besley ou Jost), texto (Sofia Sans ou Jost) e a letra miúda condensada, comum aos dois.
- Profundidade por fio e tom de papel; sombra só no que está por cima.
- Troca de mundo como colagem: o cartaz cola por cima do rótulo e descola na volta, com as letras P, L, T, S da marca viajando.
- Ilustrações autorais em SVG, desenhadas com os tokens do mundo, ocupam o lugar das fotos enquanto não há conteúdo real.

## Colors

Plates é papel quente com duas tintas de impressão; Plots é preto fosco com uma única tinta luminosa. Os valores normativos estão no frontmatter; no código, use sempre os nomes semânticos (`background`, `surface`, `sunken`, `foreground`, `soft`, `rule`, `rule-strong`, `brand`, `on-brand`, `second`, `danger`, `star`).

### Primary
- **Terracota de Rótulo** (`plates-accent`): destaque padrão de Plates. Preenche o botão principal e o bloco ativo do alternador; desenha o carimbo da nota, as estrelas, o @username, o foco e a seleção de texto.
- **Amarelo-legenda** (`plots-accent`): destaque padrão de Plots, a cor da legenda de filme. Preenche o botão principal, o selo da nota e o bloco ativo do alternador; colore as estrelas, as notas nos créditos e o título do cartaz.
- **Tintas pessoais** (`plates-accent-mostarda`, `-vinho`, `-petroleo`, `-ameixa`; `plots-accent-terracota`, `-oliva`, `-vinho`, `-petroleo`, `-ameixa`): cada pessoa escolhe uma chave (`data-accent`) e ela resolve para um par, um tom fundo em Plates e um tom luminoso em Plots. Em Plates, "terracota" e "oliva" reutilizam `plates-accent` e `plates-second`; em Plots, "mostarda" é o próprio `plots-accent`.

### Secondary
- **Oliva de Segunda Tinta** (`plates-second`): a segunda tinta do rótulo. Aparece no traço das ilustrações (o contorno do prato) e nunca em controles. Quando a pessoa escolhe "oliva" como destaque, as duas tintas trocam de lugar e a segunda passa a ser a terracota.
- Plots não tem segunda tinta: `second` aponta para a própria tinta clara do cartaz.

### Neutral
- **Papel Creme** (`plates-bg`): fundo de Plates e da área fora do conteúdo (overscroll, barra do sistema).
- **Folha** (`plates-surface`): a folha por cima do papel: rótulo de registro, campos, barra inferior. É também a cor do texto sobre o destaque.
- **Rebaixo** (`plates-sunken`): fundo do arco das fotos, esqueletos de carregamento e hover de botões secundários e etiquetas.
- **Tinta Café** (`plates-ink`) e **Café Suave** (`plates-ink-soft`): texto principal e texto de apoio (letra miúda, dicas, itens inativos).
- **Fio** (`plates-rule`) e **Fio Forte** (`plates-rule-strong`): divisórias leves; contorno de campos, botões secundários, fio duplo e moldura de rótulo.
- **Preto Fosco** (`plots-bg`), **Grafite** (`plots-surface`), **Grafite Rebaixado** (`plots-sunken`): fundo do cartaz; barra inferior e cartões de registro; campos, fundo dos pôsteres e esqueletos.
- **Tinta de Tela** (`plots-ink`) e **Cinza de Créditos** (`plots-ink-soft`): texto principal e bloco de créditos.
- **Fio** (`plots-rule`) e **Fio Forte** (`plots-rule-strong`): divisórias e contornos, como em Plates.
- **Erro** (`plates-danger`, `plots-danger`): mensagem de erro e contorno de campo inválido; o botão de ação destrutiva usa só contorno e texto nessa cor.

### Named Rules
**A Regra da Tinta Pessoal.** A cor de destaque é da pessoa, não do tema. Nenhum componente escreve um hex de destaque: usa `brand`, `on-brand` e `star`. Toda chave nova de `data-accent` entra com os dois valores, um por mundo, e os dois passam AA contra o fundo e como fundo de texto (o par mais fraco hoje é a terracota de Plates, 5,1:1).

**A Regra do Acento na Ação.** O destaque fica na ação principal, na nota (carimbo, selo, estrelas, notas nos créditos), no lado ativo do alternador, no @username e no foco. Seleção de etiqueta usa tinta sobre fundo invertido, não o destaque; botões secundários e discretos usam tinta e fio.

**A Regra das Duas Tintas.** Em Plates, uma ilustração é impressa em duas tintas (`brand` e `second`) sobre papel. Em Plots, uma ilustração usa a tinta clara, os tons de grafite e uma única forma na cor de destaque.

## Typography

**Display Font:** Besley em Plates (com Clarendon, Rockwell, Georgia); Jost em Plots (com Futura, Century Gothic)
**Body Font:** Sofia Sans em Plates (com Segoe UI, Roboto); Jost em Plots
**Label/Mono Font:** Sofia Sans Extra Condensed nos dois mundos (com Arial Narrow)

**Character:** Plates fala em Clarendon de rótulo, pesada e em caixa mista, sobre uma grotesca calma. Plots fala em Futura de cartaz, extra-negrita e em caixa alta, com a mesma família no texto. A letra miúda condensada é a única voz comum: o número de catálogo e o bloco de créditos.

O utilitário `font-display` aplica família, peso, tracking e caixa do mundo ativo (a entrelinha é dada em cada uso); `font-micro` aplica a letra miúda.

### Hierarchy
- **Marca** (peso do título; 2,5rem em Plates e 2,375rem em Plots no cabeçalho; `clamp(4.5rem, 27vw, 9rem)` com entrelinha 0,82 no "PLOTS" da porta, `clamp(3rem, 15vw, 4.25rem)` com entrelinha 0,95 no "Plates"): a palavra da seção, letra por letra, cada uma com o próprio `view-transition-name`.
- **Display** (Plates: 700, `clamp(2.25rem, 9vw, 3.5rem)`, entrelinha 1,02; Plots: 800, caixa alta, `clamp(2.5rem, 11vw, 4.5rem)`, entrelinha 1,14): o título da tela, um por tela, com `text-wrap: balance`.
- **Headline** (1,5rem; 1,75rem nos títulos de formulário da porta; entrelinha justa): título de seção dentro da tela e nome no perfil.
- **Title** (1,375rem): título de bloco e título dentro de um registro (nome do restaurante, título do cartaz).
- **Body** (400, 1,0625rem com entrelinha 1,625 no parágrafo de abertura; 1rem no texto comum; 0,875rem em dicas e erros; medida de 44 a 60ch): texto corrido. Em Plots o texto leva tracking de 0,005em.
- **Label** (600, caixa alta, tracking 0,09em, algarismos tabulares; 0,75rem na barra inferior e no número de catálogo, 0,8125rem em rótulos de campo e linhas de crédito, 0,9375rem no alternador e na navegação larga): letra miúda.
- **Rótulo de botão** (Plates: 600, 1rem, caixa mista; Plots: 700, 0,875rem, caixa alta, tracking 0,08em; um degrau menor no tamanho `sm` e nas etiquetas).

### Named Rules
**A Regra da Caixa.** Em Plots, título, botão e etiqueta são sempre em caixa alta; em Plates, sempre em caixa mista. A caixa vem do token (`--pap-display-case`) e das variantes `plots:`, nunca do texto digitado.

**A Regra da Letra Miúda.** `font-micro` é para o que um impresso põe em letra miúda: número de catálogo, linha de créditos, rótulo de campo, legenda de selo, rótulo de navegação. Fica abaixo ou dentro da peça a que pertence. Nunca carrega texto corrido.

**A Regra do Número de Catálogo.** Todo registro tem número de série com quatro algarismos e zeros à esquerda: "Visita nº 0012" em Plates, "Sessão nº 0087" em Plots.

**A Regra do Acento Gráfico.** Título em caixa alta de Plots que pode quebrar em mais de uma linha usa entrelinha 1,14, para os acentos do português não encostarem na linha de cima. Entrelinha abaixo de 1 fica para a marca, uma palavra só e sem acento.

## Layout

Uma coluna, primeiro para o celular. O conteúdo fica num contêiner de até 64rem com margem lateral do mundo (`px-page`: 1,25rem em Plates, 1rem em Plots) e as seções da tela se separam pelo ritmo do mundo (2,75rem em Plates, 2,25rem em Plots). Plots é mais apertado de propósito: o cartaz ocupa a tela até a borda; o rótulo respira.

No celular a navegação é uma barra inferior fixa (até 28rem de largura, centrada) com um destino de cada lado e o alternador Plates ↔ Plots no meio; o conteúdo reserva 7rem no fim para ela e respeita as áreas seguras do sistema. A partir de 768px a barra some e a navegação sobe para o cabeçalho, à direita da marca. Grades internas passam de uma para duas colunas a partir de 640px.

A porta (entrar, cadastro, primeiro acesso) é a única tela com os dois mundos ao mesmo tempo: no celular o cartaz ocupa no mínimo 36% da altura no topo e o rótulo fica com o resto, para o botão principal caber na primeira dobra; no primeiro acesso o cartaz encolhe ao conteúdo. A partir de 768px os mundos ficam lado a lado na proporção 5:6. O formulário tem no máximo 24rem.

Controles têm 48px de altura (40px no tamanho `sm` e nas etiquetas, 44px no botão só de ícone e no alternador); os itens da barra inferior têm no mínimo 56px. Formulários empilham campos com 1,25rem de intervalo; rótulo, controle e mensagem de um campo ficam a 0,375rem.

Registros mantêm a proporção do material: foto de Plates em arco 4:5, pôster de Plots 2:3, em grade de três colunas com 0,625rem de intervalo.

## Elevation & Depth

O sistema é plano. A profundidade vem do tom do papel (fundo, folha, rebaixo) e do fio: um fio simples separa, o fio duplo e a moldura dupla marcam uma peça impressa. Sombra não decora nem separa cartões; ela diz que uma peça está fisicamente por cima de outra.

### Shadow Vocabulary
- **Folha de cima** (`--pap-shadow-sheet`; Plates: `0 -10px 28px -14px rgb(43 29 20 / 0.28), 0 -1px 0 rgb(43 29 20 / 0.08)`; Plots: `0 -16px 36px -12px rgb(0 0 0 / 0.85), 0 -1px 0 rgb(242 239 232 / 0.06)`): a barra inferior do celular, que fica sobre o conteúdo que rola.
- **Peça solta** (`--pap-shadow-lift`; Plates: `0 14px 30px -16px rgb(43 29 20 / 0.35), 0 2px 4px -2px rgb(43 29 20 / 0.12)`; Plots: `0 20px 40px -18px rgb(0 0 0 / 0.9), 0 3px 6px -3px rgb(0 0 0 / 0.6)`): controle pousado sobre uma fotografia (trocar capa, trocar foto).
- **Fio interno** (`inset 0 0 0 3px` na cor de destaque seguido de `inset 0 0 0 4px` na cor do texto a 55%): não é sombra, é o filete impresso por dentro do botão principal de Plates.

### Named Rules
**A Regra da Folha de Cima.** Só tem sombra o que está por cima de outra coisa: a barra inferior sobre a página, um controle sobre uma foto. Registros, campos, botões e blocos são planos em repouso e em hover.

## Shapes

Plates é canto de papel cortado: raios pequenos (1px, 2px, 4px; 8px reservado no token) e três formas próprias do rótulo. O **arco** (`arch`: topo totalmente redondo, base com raio de 4px) emoldura fotos e seus esqueletos. O **fio duplo** (`rule-double`: `3px double` no fio forte) abre o bloco de texto de um rótulo e o formulário da porta. A **moldura de rótulo** (`frame-label`: borda de 1px e um segundo fio de 1px afastado 3px, raio de 2px) contorna um registro inteiro. O círculo é reservado ao que é carimbado ou pessoal: carimbo da nota, avatar, amostra de cor, controle sobre foto.

Plots é canto vivo: raio 0 em tudo o que é imagem, selo ou avatar, e 2px em controles. Pôsteres são retângulos 2:3 sem moldura; divisórias são um fio simples de 1px. O arco, o fio duplo, a moldura dupla e o círculo não existem em Plots.

O foco é o mesmo gesto nos dois: contorno de 2px na cor de destaque, afastado 3px em Plates e 2px em Plots.

## Components

Cada componente existe uma vez e muda de forma com o mundo. Toque e soltura usam as molas do mundo (`SPRING[section]` em `src/lib/motion.ts`): `press` para apertar, `pop` para a estrela que salta, `settle` para o que assenta; as de Plates são macias e passam um pouco do ponto, as de Plots são rígidas e amortecidas. Transições de cor usam a duração rápida do mundo (140ms em Plates, 110ms em Plots; base 260/200ms, lenta 520/420ms).

### Buttons
Etiqueta impressa em Plates, bloco de cartaz em Plots.
- **Shape:** raio de controle do mundo (4px em Plates, 2px em Plots); 48px de altura com 1,25rem de respiro lateral; `sm` com 40px; só ícone com 44px.
- **Primary:** fundo na cor de destaque, texto em `on-brand`. Em Plates leva o fio interno; em Plots é caixa alta, peso 700, tracking 0,08em.
- **Hover / Focus:** o principal clareia (brilho 110%) e escurece ao apertar (95%); todos encolhem a 0,96 no toque com a mola `press`; foco pelo contorno padrão do mundo.
- **Secondary / Quiet / Danger:** secundário é transparente com contorno no fio forte e hover em rebaixo; discreto não tem contorno; destrutivo tem texto e contorno na cor de erro, com hover a 10% dela.
- **Busy / Disabled:** ocupado mostra um anel girando antes do rótulo e bloqueia cliques; desabilitado fica a 45% de opacidade.

### Chips
- **Style:** etiqueta de marcar e desmarcar, 40px de altura, raio de controle, contorno no fio forte, texto na tinta; em Plots em caixa alta e um degrau menor.
- **State:** marcada inverte para tinta sobre fundo (fundo `foreground`, texto `background`) e ganha um ícone de confirmação à esquerda; desmarcada tem hover em rebaixo. Encolhe a 0,94 no toque.

### Cards / Containers
- **Rótulo (Plates):** folha em `surface` dentro da moldura de rótulo, respiro de 0,875 a 1rem; foto em arco 4:5; abaixo, fio duplo, nome em título, linha de apoio e uma última linha com o número de catálogo à esquerda e o carimbo à direita.
- **Cartaz (Plots):** pôster 2:3 de canto vivo sobre `sunken`; quando é um cartão, contorno de 1px no fio forte sobre `surface`, título na cor de destaque e a linha de créditos em letra miúda acima de um fio simples.
- **Shadow Strategy:** nenhuma (ver Elevation & Depth).
- **Bloco de tela:** seção aberta por um fio de 1px no fio forte, título em Title e 1,25rem de respiro.

### Inputs / Fields
- **Style:** rótulo sempre visível em letra miúda acima do controle; controle de 48px, contorno de 1px no fio forte, raio de controle, fundo `surface` em Plates e `sunken` em Plots, texto de 1rem; área de texto com mínimo de 6rem. Prefixo fixo (o "@" do username) em tinta suave dentro do campo; contador ou nota à direita do rótulo.
- **Focus:** a borda passa para a cor de destaque, além do contorno de foco.
- **Error / Disabled:** borda na cor de erro e mensagem abaixo em 0,875rem, peso 500, anunciada como alerta e ligada por `aria-describedby`; desabilitado a 50%.

### Navigation
- **Barra inferior (celular):** folha em `surface` com fio no topo e a sombra de folha de cima; ícone de 24px com rótulo em letra miúda de 0,75rem; ativo em tinta com traço mais grosso, inativo em tinta suave. Fica ancorada durante a troca de mundo.
- **Cabeçalho (a partir de 768px):** links em letra miúda de 0,9375rem com ícone; o ativo leva sublinhado de 2px na cor de destaque, afastado.
- **Alternador Plates ↔ Plots:** trilho de 44px com contorno no fio forte e 3px de respiro; o lado ativo é um bloco na cor de destaque com o nome em `on-brand`, o inativo em tinta suave. Na troca, o bloco desliza de um lado para o outro (460ms).

### Nota: estrelas, carimbo e selo
- **Estrelas:** cinco estrelas de contorno no fio forte, preenchidas na cor `star` em meias unidades; 36px para dar a nota, 18px para ler. Ao confirmar, a estrela tocada salta (escala 1,32 e giro de -8°) com a mola `pop`. No teclado é um controle deslizante; tocar na nota atual limpa.
- **Carimbo (Plates):** círculo torto a -6°, borda de 2px e um anel interno de 1px na cor de destaque, número em letra de título e legenda em letra miúda ("você", "par", "casal"). Três tamanhos: 56, 72 e 96px.
- **Selo (Plots):** o mesmo dado como bloco reto, preenchido com a cor de destaque, sem giro.
- **Número que gira:** todo número que muda troca dígito por dígito, cada algarismo uma coluna que desliza até o valor com a mola `settle`.

### Marca e troca de mundo
A marca é a palavra da seção em letra de título. "Plates" e "Plots" dividem P, L, T e S: na troca essas letras viajam de uma palavra à outra (560ms), A e E caem (260ms) e o O entra (420ms, com 140ms de atraso). A troca é uma View Transition tipada: em `to-plots` o cartaz desce de cima e cola sobre o rótulo, com um leve giro (640ms), enquanto o rótulo recua a 93% e 35% de opacidade; em `to-plates` o cartaz descola pelo canto e cai (540ms) e o rótulo volta. Navegação comum usa só uma dissolução de 200ms. Com `prefers-reduced-motion`, tudo vira uma dissolução de 160ms sem deslocamento.

### Avatar, ilustração e carregamento
- **Avatar:** redondo em Plates, quadrado em Plots; sem foto, as iniciais em letra de título sobre a cor de destaque.
- **Ilustração:** SVG autoral desenhado só com tokens do mundo (prato em duas tintas no arco; cartaz geométrico com uma forma no destaque). Ocupa o lugar da foto enquanto ela não existe e é sempre apresentada como exemplo.
- **Esqueleto:** bloco em `sunken` na forma do que vai chegar (arco em Plates, 2:3 em Plots), com um brilho que atravessa em 1,4s; parado com movimento reduzido.

## Plates: caderno, restaurante e mapa (fase 2)

Peças do rótulo aplicadas às telas de Plates. A direção e as decisões estão em `.impeccable/surfaces/src-app-plates.md`.

- **Rótulo do caderno:** moldura de rótulo sobre `surface`, arco 4:5 (foto ou a gravura do prato), fio duplo, nome em Besley de 1,125 a 1,25rem (`plates-label-title*`), lugar em letra miúda de 0,6875rem (`micro-xs`) e, no pé, as visitas à esquerda e o carimbo pequeno à direita. O giro do carimbo varia por restaurante (−8° a −3°). No "quero ir", o pé mostra o motivo em itálico, a prioridade e o botão "Fomos!".
- **Prateleira:** grade de duas colunas (três a partir de 768px) em que uma coluna desce 1,5rem, como potes desalinhados. Filtro e reordenação usam animação de layout com a mola `settle`.
- **Índice:** a vista em lista é o índice de um caderno de receitas: nome em Besley, pontilhado de 2px no fio forte até a nota na margem, letra miúda embaixo. A partir de 40 linhas só as visíveis ficam no DOM.
- **Tabela de informação:** a nota do restaurante é a tabela de um rótulo de mercearia: contorno de 2px na tinta, cabeçalho em letra miúda, uma linha por critério (estrelas de 16px e número em Besley) e, depois de um fio de 6px na tinta, a nota geral em carimbo.
- **Cardápio:** pratos numerados em letra miúda, nome em Besley, pontilhado até a nota (na cor de destaque; "dar nota" em tinta suave quando não há).
- **Folha inferior:** sobe do pé da tela com `--pap-dur-slow` e a curva de saída do mundo (no computador aparece centrada); título em Besley, fio duplo abaixo, ações fixas no pé. É a única outra peça com a sombra de folha de cima.
- **Carimbo "Novo":** o "+" de Plates é um carimbo redondo de 64px pousado acima da barra inferior, à direita, com a sombra de peça solta; some no cadastro e no mapa.
- **Mapa:** estilo claro do OpenFreeMap tingido com os tokens (fundo papel, água em rebaixo, rótulos em tinta café). "Fomos" é um círculo cheio na cor de destaque com a nota; "quero ir" é um anel de 3,5px na segunda tinta; grupos são um círculo de folha com contorno de destaque e a contagem. O pin do formulário é uma gota na cor de destaque com a sombra de peça solta. A atribuição fica recolhida no "i".
- **Salto (`POP`):** estrela que carimba e "Fomos!" usam quadros-chave de ida e volta com a curva `POP[section]` de `src/lib/motion.ts` (molas do Motion não aceitam três quadros).

## Plots: diário, título, quero ver e listas (fase 3)

Peças do cartaz aplicadas às telas de Plots. A direção e as decisões estão em `.impeccable/surfaces/src-app-plots.md`.

- **Pôster:** sempre 2:3, canto vivo, sobre `sunken`; imagem do TMDB direto do servidor deles no tamanho do lugar (`w92` em linhas, `w185` em listas e Top 4, `w342` em grades, `w1280` no fundo), sem passar pelo otimizador; sem imagem, a arte de cartaz geométrica do mundo, escolhida de forma estável pelo título.
- **Diário:** o mês é um letreiro (Jost 800, caixa alta, na cor de destaque); cada sessão é uma linha com pôster pequeno, título em caixa alta (com "T2" em série na cor de destaque), a linha de créditos em letra miúda (dia · sessão nº 0087 · reassistido · curtido) e a nota no selo amarelo à direita.
- **Página do título:** fundo a toda largura que se dissolve no preto por máscara; pôster sobreposto com a sombra de peça solta; título em caixa alta na cor de destaque. As duas ações com texto dividem a linha e os ícones (Top 4, lista) ficam no fim.
- **Bloco de créditos:** direção/criação, elenco e duração em letra miúda, função em cinza e nomes em tinta clara, como o pé de um cartaz de cinema.
- **Onde assistir:** logos quadrados de 48px; os dos streamings do perfil ganham contorno de 2px na cor de destaque e a legenda "No seu"; a atribuição à JustWatch fica logo abaixo.
- **Faixa de streaming:** no "quero ver", quando o título está num serviço do perfil, uma faixa na cor de destaque no pé do pôster diz "No seu Netflix", como uma legenda.
- **Selo "+":** bloco quadrado de 56px na cor de destaque com "+" e "BUSCAR", pousado acima da barra inferior, com a sombra de peça solta; some na própria busca.
- **Curtida:** o coração salta com a curva `POP` ao marcar.
- **Capa de lista:** até quatro pôsteres em leque (deslocados 44px, com a sombra de peça solta) sobre `sunken`.
- **Top 4:** quatro molduras 2:3; as vazias com contorno tracejado de 2px; tocar num pôster abre a folha com mover e tirar (alvos de 48px).
- **Atribuição do TMDB:** logo oficial (`public/brand/tmdb-logo.svg`) e o aviso em inglês exigido, no rodapé das telas com dados do TMDB.

## Casal, pessoas e comunidade (fase 4)
O par e as outras pessoas aplicados aos dois mundos. A direção e as decisões estão em `.impeccable/surfaces/src-app-casal.md`.
- **Letreiro do casal:** em Plates, os dois nomes em Besley de 1,625rem ligados por um "&" itálico de 2,125rem na cor de destaque, com os avatares redondos de 56px sobrepostos (o segundo com anel `background` de 4px); em Plots, "Estrelando" em letra miúda e os nomes em Jost caixa alta de 1,25rem, avatares quadrados de 48px encostados. Convite pendente: segundo nome e avatar em tinta suave.
- **Cor do outro:** tudo que é de outra pessoa (avatar, carimbo, nome no letreiro de Plots) sai na cor de destaque dela, aplicando `data-theme` + `data-accent` no próprio elemento (`accent`/`world` em `Avatar`, `accent` em `Stamp`). A média do casal usa `Stamp tone="ink"`: tinta em Plates, `sunken` com fio forte em Plots.
- **Tabela você · par · casal:** a tabela de informação do rótulo ganha três colunas de números tabulares alinhados à direita (cabeçalho em letra miúda); a nota geral mostra três carimbos (você e par pequenos, casal médio).
- **Juntos:** etiqueta de marcar "Fomos juntos"/"Vimos juntos" com o avatar do par de 20px; na visita, "juntos" como etiqueta de contorno e "registrada por" com mini-avatar de 16px; no diário, "Juntos" na linha de créditos e, sem nota, um quadrado tracejado "Dar nota" no lugar do selo.
- **Adicionado por:** mini-avatares de 16px e "por Bia"/"por você"/"pelos dois" em letra miúda, só quando há par.
- **Comunidade:** bloco de tela com a média em número de 2rem e "de N avaliações"; cada avaliação com avatar de 32px, nome, data em letra miúda, review (itálico em Plates) e carimbo pequeno.
- **Perfil público:** capa e avatar como no próprio perfil; três números de 1,75rem numa faixa entre fios (cardápio em Plates, créditos em Plots); favoritos em rótulos pequenos 2×2 (4 colunas no computador) ou Top 4 em linha; recentes em linhas.

## Wrapped, sorteio e conquistas (fase 5)
A direção e as decisões estão em `.impeccable/surfaces/src-app-extras.md`.
- **Wrapped (stories):** tela cheia por cima da navegação, palco em 9:16 centrado (faixas pretas nas telas largas). Cada story é um quadro do seu mundo (`SectionProvider` + `data-theme` + `data-accent` de quem vê) com moldura de rótulo (Plates) ou fio simples (Plots) a 12px da borda e "PAP · ano" no pé. Número principal de `clamp(4rem, 28vw, 6rem)`; títulos de story de 1,5 a 2rem (fora da rampa de propósito: é a escala de cartaz); linhas de cardápio com pontilhado (Plates) e créditos em letra miúda espaçada (Plots). Abertura e encerramento dividem a tela: metade creme, metade preta, o ano de `clamp(6rem, 40vw, 11rem)` atravessando as duas.
- **Ritmo do Wrapped:** segmentos de progresso de 3px que enchem em 6s (`pap-story-progress`, pausa com `animation-play-state`); troca de story com o painel novo entrando pela lateral (mola `settle` de Plots); movimento reduzido: dissolve e sem avanço automático. Compartilhar gera PNG 1080×1920 do story atual.
- **Sorteio:** folha com filtros em etiquetas numa faixa rolável (etiquetas nunca quebram linha) e o baralho de até cinco cartas 2:3 desalinhadas (−4° a 4°) com o monograma "PAP" no verso; embaralhar = leque de ida e volta em 1,1s (só `transform`), a de cima vira com `rotateY` e assenta com a mola `settle`. Plates: carta-rótulo; Plots: carta-pôster.
- **Conquistas:** carimbo redondo de anel duplo (Plates) ou placa 5:4 de canto vivo (Plots), ícone de traço no centro; bloqueada = contorno tracejado em tinta suave e progresso "7 de 10". Desbloqueio: véu a 40% e a badge em 140px (Plates carimba com a mola `pop`; Plots acende em três piscadas); várias de uma vez: "Vocês já tinham N conquistas!" com as badges em leque escalonado. A badge de outra pessoa sai na cor de destaque dela.

## Do's and Don'ts

### Do:
- **Do** envolver toda tela em um único `[data-theme]` e usar os nomes semânticos (`bg-brand`, `text-soft`, `border-rule-strong`, `rounded-md`); o mesmo componente tem de funcionar nos dois mundos.
- **Do** usar `font-display` para títulos e `font-micro` para número de catálogo, créditos, rótulos de campo e de navegação; deixe a caixa e o peso virem do token.
- **Do** dar a cada registro o material do seu mundo: em Plates, moldura de rótulo, arco 4:5, fio duplo e carimbo; em Plots, pôster 2:3 de canto vivo e notas na linha de créditos.
- **Do** mostrar a nota de cada pessoa separada e a do casal ao lado, com legenda em letra miúda dizendo de quem é.
- **Do** animar só `transform` e `opacity`, com as molas e durações do mundo, e trocar de mundo sempre pelo roteador de transição com o tipo `to-plots` ou `to-plates`.
- **Do** manter 44px ou mais em todo alvo de toque e rótulo visível em todo campo.
- **Do** conferir AA nos dois mundos e em todas as cores de destaque antes de acrescentar um par novo.

### Don't:
- **Don't** escrever hex de cor em componente, nem a cor de destaque padrão: ela é da pessoa e muda com `data-accent`.
- **Don't** levar forma de um mundo para o outro: sem arco, fio duplo, carimbo redondo ou círculo em Plots; sem caixa alta em título ou bloco preenchido como selo em Plates. A porta é a única tela com os dois mundos, cada um na sua metade.
- **Don't** pôr sombra em registro, campo, botão ou bloco; sombra é só da barra inferior e de controle pousado sobre foto.
- **Don't** usar a cor de destaque em etiqueta marcada, botão secundário ou divisória.
- **Don't** escrever texto corrido em letra miúda, nem título de Plots em caixa mista.
- **Don't** animar largura, altura, margem ou cor de fundo de página na troca de mundo, nem criar uma segunda transição de troca.
- **Don't** apresentar ilustração ou dado de exemplo como registro real.
