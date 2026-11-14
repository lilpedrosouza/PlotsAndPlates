# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Um casal (o dono do projeto e a namorada) que registra junto o que come e o que assiste. Usam o app pelo celular Android, instalado como PWA, em dois momentos: na hora (ainda na mesa do restaurante ou no sofá, logo depois do filme) para um registro rápido, e depois, com calma, para completar notas, critérios e reviews.

Outras pessoas podem criar conta e usar o app do mesmo jeito, sozinhas ou com o próprio par. Elas não são o público principal.

## Product Purpose

PlotsAndPlates (PAP) é o diário a dois do casal, em duas seções:

- **Plates**: restaurantes visitados, os pratos pedidos em cada visita e as avaliações (comida, atendimento, ambiente, custo-benefício).
- **Plots**: filmes, séries, documentários, animes e especiais assistidos, com diário, nota por temporada e nota da série.

Cada seção tem uma lista de vontade ("quero ir" / "quero ver"). Sucesso é o casal conseguir registrar uma saída ou uma sessão em poucos toques, reencontrar depois o que achou de cada lugar e título, e decidir mais fácil o que fazer hoje.

Uso pessoal, sem fins comerciais.

## Positioning

Cada pessoa dá a própria nota e o app mostra as duas lado a lado, com a média do casal. Restaurantes e telas ficam no mesmo lugar, compartilhados com o par. Não é rede social: não tem feed nem seguidores.

## Operating Context

- Registro rápido com uma mão, no celular, muitas vezes com conexão ruim; complemento posterior do que ficou faltando.
- Visitas e sessões podem ser marcadas como "juntos"; listas de vontade são compartilhadas e mostram quem adicionou cada item.
- Dá para buscar um usuário, ver o perfil básico dele e as avaliações públicas nas páginas de restaurante e de título ("O que o pessoal do PAP achou").
- Momentos recorrentes: "O que a gente faz hoje?" (sorteio nas listas de vontade), conquistas, e a retrospectiva anual (PAP Wrapped).

## Capabilities and Constraints

- Notas de 0,5 a 5 em meia estrela. Nota geral do restaurante = média dos critérios arredondada para meia estrela. Médias de casal e de comunidade são calculadas, nunca armazenadas.
- Avaliações são por usuário e podem ser privadas (visíveis só para o dono e o par).
- Vínculo de casal por convite aceito.
- Interface em português do Brasil.
- Mobile-first, PWA instalável, barra de navegação inferior no celular, alternador Plates ↔ Plots sempre visível.
- Desempenho é requisito: Lighthouse mobile ≥ 90, LCP < 2,5 s, INP < 200 ms, CLS < 0,1; animações fluidas mesmo em Android intermediário (CPU 4x mais lenta).
- Dados de restaurante salvos vêm do OpenStreetMap e do que o casal preenche; o Google Places serve só para localizar o lugar (guarda-se o `place_id`). Dados de títulos vêm do TMDB, com atribuição ao TMDB e à JustWatch.
- Serviços em planos gratuitos (Vercel Hobby, Supabase Free) e Railway.

## Brand Commitments

- Nome: PlotsAndPlates, abreviado PAP.
- Duas identidades visuais, definidas pelo dono: Plates é claro e quente (creme, terracota, verde-oliva), com títulos serifados e cara de caderno de receitas ou cardápio de bistrô, com fotos de comida em destaque; Plots é escuro de cinema (preto/grafite com um acento vibrante), com sans geométrica, pôsteres em grid e clima de sala de cinema.
- Trocar de seção muda o design inteiro, com uma transição animada marcante.
- Plots é inspirado no Letterboxd mas tem identidade própria: não copiar marca, cores ou layout.
- Cada usuário escolhe uma cor de destaque, aplicada na própria interface.
- Tom de voz informal, carinhoso e direto, na primeira pessoa do plural: "Fomos!", "Assistimos!", "O que a gente faz hoje?".

## Evidence on Hand

- Ainda não há conteúdo real: fotos de comida, pôsteres e avaliações chegam com o uso (fotos do casal; pôsteres e backdrops do TMDB).
- Não há logotipo nem ilustrações prontas.
- Telas de demonstração devem usar dados de exemplo claramente fictícios (o seed do projeto), nunca avaliações inventadas apresentadas como reais.

## Product Principles

1. **Duas notas, um diário.** A opinião de cada um aparece inteira; a média do casal soma, não substitui.
2. **Registrar é rápido, lembrar é rico.** Poucos toques na hora; detalhe e contexto depois.
3. **O conteúdo é o protagonista.** Fotos de comida e pôsteres mandam na tela; a interface serve a eles.
4. **Dois mundos, um app.** Plates e Plots têm identidades próprias, e a passagem entre eles é parte da experiência.
5. **Nunca travar.** Fluidez no celular vale mais do que qualquer efeito.

## Accessibility & Inclusion

Contraste AA, labels em todos os controles, navegação por teclado e uma versão reduzida das animações para quem usa `prefers-reduced-motion`.
