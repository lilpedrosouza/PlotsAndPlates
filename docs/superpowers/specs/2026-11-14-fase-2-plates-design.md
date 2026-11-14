# Fase 2 — Plates completo

Data: 2026-11-14. Base: documento do projeto (seção 2 e requisitos gerais), decisões da fase 1 e a resposta sobre edição.

## Para quê

O casal registra cada saída para comer em poucos toques, na mesa ou depois: o lugar, a visita, o que pediram e o que cada um achou. Depois reencontra tudo no caderno, no mapa e na lista "quero ir". Sucesso: cadastrar um restaurante novo e avaliar a visita em menos de um minuto no celular, mesmo se o Google estiver fora do ar.

## Objetivos

- Cadastro do restaurante: busca com autocomplete, link do Google Maps colado, ou manual. Tudo editável depois.
- Visitas (data, ocasião, fotos, valor gasto).
- Pratos (nome, foto, descrição, preço, categoria), ligados às visitas; nota, comentário e "pediria de novo?" por pessoa; ranking por restaurante.
- Avaliação do restaurante por critério (comida, atendimento, ambiente, custo-benefício), nota geral calculada, review, opção privada.
- Quero ir com motivo e prioridade; botão "Fomos!" vira visita e abre a avaliação.
- Caderno em grid e lista, com filtros (cozinha, bairro/cidade, preço, nota, visitado/quero ir) e ordenação.
- Mapa com pins diferentes para visitados e quero ir, com clusters.
- Dados de exemplo no modo local e no seed; testes de nota, permissões e API.

## Fora desta fase (e onde entra)

- Vínculo de casal, "juntos", notas lado a lado com média do casal, quero ir compartilhado com "quem adicionou": **fase 4**. O banco já nasce com as colunas e as policies preparadas para o par (ver "Permissões").
- "O que o pessoal do PAP achou" e perfis de outros usuários: **fase 4**. Os dados da fase 2 já servem para isso (restaurante único, notas públicas).
- Sorteio "O que a gente faz hoje?" e conquistas: **fase 5**.

## Não pode acontecer (anti-objetivos)

- Salvar dados do Google além do `place_id` (nome, endereço, telefone, horário, fotos, nota do Google) ou mostrar dados do Google no mapa MapLibre.
- Ficar sem cadastrar porque o Google falhou: sempre há OpenStreetMap e, por último, o formulário manual.
- Gastar cota do Google sem o usuário pedir (nada de chamada automática ao abrir uma página).
- Travar no Android: listas longas virtualizadas, mapa carregado só na rota do mapa.

## Decisões já tomadas

- **Google só como localizador** (caminho 1, fase 1): guarda-se o `place_id`; o que é salvo vem do OpenStreetMap e do que vocês preenchem.
- **Restaurante é um registro único**, compartilhado por todos. **Quem cadastrou e o par dessa pessoa editam os dados e a lista de pratos**; os outros usuários veem e avaliam (resposta de 2026-11-14). Consequência: um usuário de fora só avalia pratos que já estão na lista.
- Stack da fase 1: Next 16 + Tailwind + shadcn no site, Hono + Drizzle na API, Postgres do Supabase com RLS, MapLibre + OpenFreeMap no mapa, Motion + View Transitions nas animações, TanStack Query.
- Visual "Rótulo & Cartaz" já definido em `apps/web/DESIGN.md` (Plates = rótulo de mercearia).

## Abordagens consideradas para o cadastro automático

1. **Google localiza, OpenStreetMap preenche (escolhida).** O autocomplete do Google acha o lugar; a API pede ao Google só a localização (campo Essentials, cota grande) e usa isso, sem salvar, para achar o mesmo lugar no OpenStreetMap (Overpass, raio de ~80 m, nome parecido). Do OSM vêm nome, endereço, coordenadas, telefone, site, horário e cozinha, quando existem. Cumpre os termos e o caminho 1.
2. **Só OpenStreetMap.** Sem custo nem cota, mas a busca do OSM por nome é fraca no Brasil; o autocomplete pedido no documento ficaria ruim. Fica como fallback.
3. **Google preenche tudo e o usuário "confirma".** Mais completo, mas é salvar conteúdo do Google com outro nome; viola os termos. Descartada (é o caminho 3 da fase 1).

## Como funciona

### Cadastro

1. Tela "Novo restaurante": campo de busca.
   - Digitando: sugestões do **Google Autocomplete (New)**, com *session token*, restritas a tipos de comida/bebida e com viés para a localização aproximada do celular (se o usuário permitir) ou o Brasil. Lista com o selo "Google" exigido.
   - Colando um link do Google Maps (inclusive `maps.app.goo.gl`): a API segue o redirecionamento, extrai nome e coordenadas da URL e faz um **Text Search** com field mask de id para obter o `place_id`.
   - Google indisponível (sem chave, cota estourada, erro): a mesma caixa passa a buscar no **Nominatim/Overpass**, com aviso discreto. Sem resultado: botão "Cadastrar à mão" com o texto digitado já no nome.
2. Escolhido um lugar, a API monta um **rascunho**:
   - Se o `place_id` (ou o id do OSM) já existe no banco, devolve o restaurante existente em vez de duplicar.
   - Senão: Place Details com field mask `location` (+ `formattedAddress` para casar), busca no Overpass por `amenity=restaurant|cafe|bar|fast_food|pub|ice_cream|food_court` perto dali e escolhe o nome mais parecido. Bairro e cidade vêm das tags do OSM ou do Nominatim reverso.
   - Sem par no OSM: rascunho só com o nome digitado pelo usuário e um pin para ele ajustar no mapinha do formulário.
3. Formulário do rascunho, tudo editável: nome, endereço, bairro, cidade, posição (pin arrastável), telefone, site, horário (texto livre), faixa de preço ($ a $$$$), cozinhas (lista com sugestões), descrição, fotos. Ao salvar escolhe-se o destino: **"Já fomos"** (cria a visita e abre a avaliação) ou **"Quero ir"** (pede motivo e prioridade).

Atribuição: "© colaboradores do OpenStreetMap" no formulário quando houver dado do OSM e no mapa; selo do Google nas sugestões e no painel ao vivo.

### Página do restaurante

- Topo com a foto em arco, nome, cozinha, bairro, faixa de preço e o selo com a sua nota geral.
- Seus critérios, review e um selo "privada" quando for.
- Ranking dos pratos: média das notas visíveis para você (na fase 2, a sua; na fase 4 entram o par e a comunidade), com "pediria de novo" e a categoria.
- Visitas em ordem cronológica, com fotos, valor e os pratos daquela visita.
- **Painel "Ver no Google"** (só aparece se houver `place_id`): só carrega quando tocado; mostra telefone, horário, site e até 3 fotos do Google, ao vivo, com atribuição, sem salvar nada. É o que gasta a cota mais cara (Enterprise), por isso é sob demanda.
- Ações: editar (só quem pode), nova visita, avaliar, adicionar prato, "Fomos!" quando estiver no quero ir.

### Visitas e pratos

- Nova visita: data (hoje por padrão), ocasião opcional, valor gasto opcional, fotos, pratos pedidos (escolher da lista ou criar na hora, se puder editar).
- Prato: nome, foto, descrição, preço, categoria (entrada, principal, sobremesa, bebida). A avaliação do prato (nota, comentário, pediria de novo) é por pessoa: uma por prato, editável.
- Avaliação do restaurante: uma por pessoa, editável; cada critério é opcional; a nota geral é a média dos critérios preenchidos arredondada para meia estrela (regra já testada em `packages/shared`).

### Quero ir

Lista própria com motivo e prioridade (alta, média, baixa). "Fomos!" cria a visita de hoje, tira o item da lista com animação e abre a avaliação.

### Caderno, filtros e mapa

- `/plates`: abas "Fomos" e "Quero ir"; grid de cards (foto em arco, nome, nota) e alternância para lista; filtros por cozinha, bairro/cidade, preço, nota mínima e situação; ordenação por mais recente, nota, nome e prioridade. Filtros e reordenação com animação de layout; listas longas virtualizadas (TanStack Virtual).
- O card se expande até virar a página do restaurante (transição de elemento compartilhado).
- `/plates/mapa`: MapLibre com tiles do OpenFreeMap num estilo ajustado ao papel creme; pins carimbados diferentes para "fomos" e "quero ir"; clusters; tocar no pin abre um cartão do restaurante. O MapLibre só é baixado nessa rota.
- Navegação inferior de Plates: Caderno, Mapa, + (novo), Quero ir, Perfil.

## Dados

Tabelas novas (todas com RLS):

| Tabela | Campos principais |
| --- | --- |
| `restaurants` | `created_by`, `google_place_id` (único), `osm_ref` (único, ex.: `node/123`), nome, endereço, bairro, cidade, `lat`/`lng` (do OSM ou do pin), telefone, site, horário (texto), `price_level` 1–4, `cuisines[]`, descrição, `cover_path` |
| `restaurant_photos` | restaurante, dono, caminho, ordem |
| `visits` | restaurante, usuário, data, ocasião, `amount_cents`, `together` (fica falso até a fase 4) |
| `visit_photos` | visita, dono, caminho |
| `dishes` | restaurante, `created_by`, nome, descrição, `price_cents`, categoria, `photo_path` |
| `visit_dishes` | visita, prato |
| `dish_ratings` | prato, usuário (único por par), nota, comentário, `would_order_again`, `is_private` |
| `restaurant_ratings` | restaurante, usuário (único por par), 4 critérios (cada um opcional), review, `is_private`; nota geral como coluna gerada a partir dos critérios |
| `restaurant_wishlist` | restaurante, usuário (único por par), motivo, prioridade |

Notas guardadas como `numeric(2,1)` com `check` de 0,5 a 5 em passos de 0,5. Médias de casal e comunidade nunca são guardadas.

### Permissões (RLS, espelhadas em `packages/shared/src/visibility.ts`)

- `restaurants`, `restaurant_photos`, `dishes`: qualquer usuário logado lê; cria quem está logado (como `created_by`); edita e apaga quem cadastrou **ou o par**, por uma função `can_edit_restaurant(id)` que na fase 2 checa só `created_by` e na fase 4 passa a incluir o par.
- `visits`, `visit_photos`, `visit_dishes`, `restaurant_wishlist`: só o dono lê e escreve (o par entra na fase 4).
- `dish_ratings`, `restaurant_ratings`: o dono lê e escreve; os outros leem só as públicas; as privadas ficam para o dono e o par (fase 4).
- `anon` sem acesso a nada; permissões de tabela explícitas (lição do deploy da fase 1).

### Fotos

Compressão no navegador antes do upload (WebP, até 1600 px, mais miniatura), reaproveitando `apps/web/src/lib/image.ts`; upload assinado no bucket `media` em `restaurants/`, `visits/` e `dishes/`. Apagar a foto no banco apaga o arquivo.

## API (novas rotas em `/v1`)

- `GET /places/autocomplete?q=&session=&near=` → Google, com fallback OSM; resposta diz a fonte.
- `POST /places/resolve` `{ googlePlaceId | mapsUrl | osmRef, query }` → restaurante existente ou rascunho.
- `GET /places/:googlePlaceId/live` → painel ao vivo (não salva, não guarda em cache).
- CRUD de `restaurants`, `restaurants/:id/photos`, `visits`, `dishes`, `ratings` (restaurante e prato), `wishlist` (+ `POST /wishlist/:id/fomos`).
- `GET /restaurants?status=&cuisine=&city=&price=&minRating=&sort=&cursor=` (paginação por cursor) e `GET /restaurants/map` (lista enxuta para os pins).

Chamadas externas com timeout, rate limit por usuário e cache em memória só do que é permitido: resultados do OSM (1 dia) e o mapeamento link → `place_id`. Nominatim respeita 1 requisição/s com User-Agent do app ("PlotsAndPlates/1.0"), sem dados pessoais.

Variáveis novas na API: `GOOGLE_PLACES_API_KEY` (opcional; sem ela o app usa só OSM). O README ganha a atualização das cotas (Autocomplete, Place Details Essentials, Text Search IDs, e Place Details Enterprise só para o painel).

## Modo local e seed

- Modo local: sem chave do Google, usa o OSM de verdade (precisa de internet) e sempre permite o manual; as contas `ana` e `bia` já vêm com uns 6 restaurantes, visitas, pratos e notas de exemplo.
- `db:seed` cria os mesmos dados de exemplo no Supabase (só para teste).

## Testes

- `packages/shared`: nota geral com critérios parciais, ranking de pratos, validação dos schemas novos.
- `packages/db`: RLS de cada tabela nova (quem lê, quem edita, privadas, anon barrado).
- `apps/api`: rotas com provedores falsos de Google e OSM (Google ok, Google sem cota → OSM, nada encontrado → rascunho manual, link do Maps, deduplicação por `place_id`).
- Navegador (Chromium local): cadastro automático e manual, visita com pratos, avaliação, quero ir → Fomos!, filtros, mapa, sem rolagem horizontal no celular, `prefers-reduced-motion`.

## Design

As telas novas seguem a direção "Rótulo & Cartaz" de `apps/web/DESIGN.md`, desenhadas com a skill `impeccable` antes do código (caderno, página do restaurante, cadastro, visita/avaliação, quero ir, mapa). Animações só com `transform` e `opacity`, molas nas interações, skeletons e UI otimista.

## Fica a critério de quem constrói

- Limiar de semelhança de nome e raio exato do casamento Google → OSM.
- Estilo exato do mapa (cores do OpenFreeMap ajustadas ao papel creme).
- Formato dos cursores de paginação e tamanhos de página.
- Lista de cozinhas sugeridas (a partir das tags `cuisine` do OSM, em português).
