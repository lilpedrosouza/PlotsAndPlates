---
version: 1
slug: "src-app-plots"
primary_target: "src/app/plots"
related_targets: ["src/components/plots"]
---

# Plots completo (fase 3)

Escopo: diário, busca no TMDB, página do título (filme e série), folha de registro, quero ver, listas e Top 4. Modo: Operate. Público: o casal, no sofá, logo depois de assistir, no celular. Tarefa principal: achar o título e registrar com nota em menos de 20 segundos; secundária: reencontrar o que viu. Refinamento do mundo "Cartaz" (`src-app.md`, `DESIGN.md`), sem redesenho; nada de marca, cores ou layout do Letterboxd.

Momento memorável: o bloco de créditos. Na página do título, direção e elenco aparecem como a faixa de créditos do pé de um cartaz de cinema (letra condensada, caixa alta, nomes em tinta clara e funções em cinza), e no diário cada sessão tem a sua linha de créditos com dia, número da sessão e nota.

## Decisões

- **Diário = programação da sala.** Meses como letreiro (Jost 800, caixa alta, mês e ano); cada registro é uma linha: pôster 2:3 pequeno de canto vivo à esquerda, título em caixa alta (com "T2" em série), linha de créditos em letra miúda (dia · sessão nº 0087 · reassistido · curtida) e a nota como selo amarelo à direita. Topo com o bloco do ano: sessões e horas assistidas.
- **Pôster** é sempre 2:3, sem moldura, sobre `sunken`; sem imagem, a arte de cartaz geométrica do mundo. Imagens do TMDB sem otimizador, no tamanho certo (`w185` em listas, `w342` em grades, `w780`/`w1280` no fundo).
- **Busca:** campo grande em Jost, resultados em grade de três pôsteres com título e ano; tipo em letra miúda. Sem token: aviso claro.
- **Página do título:** fundo (backdrop) a toda largura que se dissolve no preto (máscara), pôster sobreposto embaixo à esquerda, título em caixa alta amarela, linha de créditos (ano · duração ou temporadas · gêneros · tipo). Ações: "Assistimos" (principal), "Quero ver", curtir/favoritar, pôr em lista. Blocos separados por fio simples: sinopse, **bloco de créditos**, onde assistir (logos quadrados; os dos streamings do perfil com contorno na cor de destaque e a faixa "No seu …"; "Dados: JustWatch"), temporadas (linha por temporada com estrelas e "Registrar"), nota da série com a sugestão como atalho ("Usar 4,5"), seus registros, listas. Rodapé com a atribuição ao TMDB.
- **Quero ver:** grade de três pôsteres; quando o título está num streaming do perfil, uma faixa amarela no pé do pôster com o nome do serviço, como a legenda de um filme. Filtros como etiquetas: "Só nos meus streamings" e tipos. "Assistimos!" abaixo do pôster.
- **Listas:** índice com a capa de cada lista feita de até quatro pôsteres em leque; página da lista numerada com pôster, título, botões ↑ ↓ para reordenar (acessíveis por teclado) e "Tirar".
- **Top 4:** quatro molduras 2:3 em linha no perfil de Plots; vazias com contorno tracejado; tocar abre a busca numa folha e escolhe o título.
- **Selo "+":** bloco quadrado amarelo de 56px acima da barra, à direita, com "+" e "BUSCAR" em letra miúda (o equivalente reto do carimbo de Plates); some na busca.
- **Folha de registro:** data, estrelas de 36px, curtida (coração que salta com `POP`), "reassistido", privada e review; em série, etiquetas T1…Tn para escolher a temporada.
- **Barra inferior de Plots:** Diário · Quero ver | alternador | Listas · Perfil.
- **Movimento:** pôster da grade → pôster da página do título (View Transition de elemento compartilhado, corte seco); curtida e "Assistimos!" com `POP`; movimento reduzido só dissolve.
