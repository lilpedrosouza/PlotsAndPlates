---
version: 1
slug: "src-app-extras"
primary_target: "src/components/wrapped"
related_targets: ["src/components/draw", "src/components/achievements", "src/app/plates/(app)/wrapped", "src/app/plots/(app)/wrapped"]
---

# Wrapped, sorteio e conquistas (fase 5)

Escopo: PAP Wrapped (stories do ano do casal), "O que a gente faz hoje?" (sorteio nas listas de vontade) e conquistas (bloco no perfil, perfil público e animação de desbloqueio). Modos: o Wrapped é **Experience** (o casal está dentro da obra; a interface some); sorteio e conquistas são **Operate**. Público: o casal no celular, à noite, decidindo o que fazer ou relembrando o ano. Refinamento dos mundos "Rótulo" (Plates) e "Cartaz" (Plots) de `src-app.md` e `DESIGN.md`; nada de marca, cores ou layout de Spotify Wrapped ou Letterboxd.

Momento memorável: **o ano como programa duplo.** O Wrapped alterna os dois mundos como se o casal folheasse um cardápio e um programa de cinema ao mesmo tempo: cada passagem entre um story de Plates e um de Plots usa o gesto da troca de mundo (o painel do outro mundo entra por cima com `transform`), e o número principal de cada story é tão grande que vira a própria ilustração.

## Decisões

### Wrapped
- **Tela cheia por cima de tudo** (sem barra inferior), fundo do mundo do story. No topo, segmentos de progresso finos (um por story) em tinta do mundo; à direita, fechar (44px). Embaixo, "Compartilhar" discreto (ícone + texto em letra miúda) — o story é o protagonista.
- **Story de Plates:** papel creme, moldura de rótulo nas bordas (respiro de 16px), número em Besley 700 de até 6rem (`clamp(4rem, 28vw, 6rem)`), legenda em letra miúda caixa alta acima de um fio duplo, frase em itálico serifado ("A gente pediu 38 pratos diferentes."). Cozinha favorita: o nome da cozinha como título de cardápio em itálico grande, com a contagem como número de catálogo. Campeão: arco 4:5 com a foto (ou a gravura do prato) e os três carimbos (você, par, casal) sobrepostos à base do arco.
- **Story de Plots:** preto fosco, número em Jost 800 caixa alta na cor de destaque, de até 6rem, legenda em letra miúda espaçada; horas assistidas viram letreiro ("142 HORAS DE SESSÃO"); gênero favorito em faixa de letreiro atravessando a tela; campeão: pôster 2:3 de canto vivo com os três selos em linha embaixo.
- **Abertura:** metade de cima creme, metade de baixo preta (as duas tintas do app), o ano enorme atravessando as duas metades (cada metade do número na tinta do seu mundo) e o letreiro do casal (componente da fase 4) no meio. **Encerramento:** o mesmo corte, com o resumo em seis linhas de créditos e "Compartilhar".
- **Concordaram / discordaram:** dois carimbos (Plates) ou dois selos (Plots) lado a lado com o nome do item; "discordaram" inclina os dois carimbos para lados opostos.
- **Conquistas do ano:** grade de até 6 badges do componente de conquistas, com o total.
- **Ritmo:** cada story entra com uma única coisa em movimento (o número sobe 24px e aparece; ou o painel do outro mundo cruza a tela). Duração do story 6s. Toque à direita/esquerda, segurar pausa, ← → no teclado. Movimento reduzido: sem avanço automático, troca por dissolve, números já no lugar.
- **Imagem para compartilhar:** o story atual em 1080×1920, sem a interface (progresso, fechar, compartilhar), com "PAP · 2026" em letra miúda no pé.

### Sorteio — "O que a gente faz hoje?"
- **Botão** no topo do quero ir/quero ver: secundário com ícone de dados (lucide `Dices`) e o texto "O que a gente faz hoje?".
- **Folha em tela cheia:** filtros em etiquetas (chips) numa faixa rolável no topo; no centro, o baralho (pilha de 5 cartas visíveis levemente desalinhadas, giro de −4° a 4°); embaixo, o botão principal "Sortear".
- **Cartas:** Plates = rótulo (moldura de rótulo, arco 4:5, nome, cozinha · preço, "por Bia"/"pelos dois"); Plots = pôster 2:3 de canto vivo com título e créditos embaixo.
- **Animação:** as cartas se abrem em leque e se recolhem duas vezes (só `transform`), a de cima sobe e vira (`rotateY` com face e verso) revelando o sorteado, que assenta com a mola `settle` do mundo. Ações abaixo: "Bora!" (principal; abre a página), "Fomos!"/"Assistimos!" e "Sortear de novo". Movimento reduzido: dissolve direto para a carta revelada.
- **Vazio:** "Nada com esses filtros." + "Limpar filtros". Um item só: revela direto, sem embaralhar.

### Conquistas
- **Badge — Plates:** carimbo redondo de 72px (anel duplo como o `Stamp`), ícone de traço (lucide) no centro, nome em letra miúda curva? não: nome embaixo em letra miúda reta. Bloqueada: contorno tracejado em tinta suave, ícone a 40%, progresso "7 de 10" embaixo.
- **Badge — Plots:** placa retangular 4:3 de canto vivo com contorno de 1px no fio forte, ícone e nome em caixa alta; ganha = fundo na cor de destaque com texto `on-brand`; bloqueada = contorno tracejado e progresso.
- **Bloco no perfil:** "Conquistas · 5 de 16" e grade de 4 colunas (3 no celular) ordenada: ganhas primeiro (mais recente antes), depois as que faltam por proximidade da meta. Tocar abre a descrição (folha pequena) com a regra e a data.
- **Perfil público:** só as ganhas, sem progresso, sem as do casal.
- **Desbloqueio (uma):** véu escuro a 40% e a badge no centro em 160px. Plates: o carimbo cai de escala 1,6 e opacidade 0 até 1 com giro de −8°, e assenta com a sobra da mola `pop`; Plots: a placa acende em três piscadas de opacidade (0 → 1 → 0,4 → 1) como letreiro. Nome e descrição dissolvem embaixo; "Que demais!" fecha. **Várias:** "Vocês já tinham N conquistas!" com as badges entrando em leque escalonado (até 8 visíveis, "+N"). Movimento reduzido: só dissolve.
