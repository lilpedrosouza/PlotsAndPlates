# Fase 3 — Plots completo

Data: 2026-11-14. Base: documento do projeto (seção 3, TMDB e cron), decisões das fases 1 e 2 e as respostas de 2026-11-14 (série no diário por temporada; Top 4 e listas nesta fase).

## Para quê

O casal registra cada filme ou temporada logo depois de assistir, em poucos toques no sofá, e depois reencontra tudo no diário: o que viu, quando, a nota e o que achou. A lista "quero ver" mostra primeiro o que está nos streamings que vocês assinam. Sucesso: achar um título e registrar com nota em menos de 20 segundos no celular.

## Objetivos

- Busca no TMDB (filmes e séries) com preenchimento automático: pôster, fundo, sinopse, ano, duração, gêneros, direção (ou criação), elenco principal, temporadas e onde assistir no Brasil.
- Tipos: filme, série, documentário, anime e especial.
- Diário: cada vez que alguém assiste vira um registro com data, nota (0,5 a 5), review, curtida e "reassistido"; cronológico, agrupado por mês.
- Séries: **um registro por temporada**, com a nota da temporada; nota da série inteira dada pela pessoa, com a média das temporadas como sugestão.
- Quero ver com o botão "Assistimos!" (vira registro no diário) e destaque para o que está nos streamings do perfil.
- Top 4 favoritos no perfil e listas personalizadas.
- Cache do TMDB no banco, nunca com mais de 6 meses; atualização pela tarefa agendada.
- Atribuição ao TMDB (logo + aviso) e à JustWatch onde aparecer "onde assistir".

## Fora desta fase

- Tudo que depende do vínculo de casal: "juntos", quero ver compartilhado com "quem adicionou", notas lado a lado, média do casal — **fase 4** (colunas e permissões já preparadas, como em Plates).
- "O que o pessoal do PAP achou" e perfil de outras pessoas — **fase 4**.
- Registro por episódio — não está no documento; fica de fora.

## Não pode acontecer

- Chave do TMDB no site: toda chamada passa pela API.
- Dados do TMDB com mais de 6 meses no banco.
- Exibir "onde assistir" sem a atribuição à JustWatch, ou dados do TMDB sem a do TMDB.
- Gastar a cota de imagens da Vercel com pôsteres: as imagens vêm do servidor do TMDB no tamanho certo, sem passar pelo otimizador.

## Decisões já tomadas

- Série no diário: um registro por temporada (resposta de 2026-11-14).
- Top 4 e listas personalizadas nesta fase (resposta de 2026-11-14).
- Stack e padrões das fases 1 e 2: API como única porta, RLS + `GRANT` explícito, testes com PGlite, TanStack Query, folhas inferiores, mundo "Cartaz" do `DESIGN.md` (preto fosco, amarelo-legenda, Jost em caixa alta, pôster de canto vivo, notas no bloco de créditos).

## Abordagens consideradas para os dados do TMDB

1. **Catálogo em cache no banco, atualizado por idade (escolhida).** Ao adicionar ou abrir um título, a API grava os dados do TMDB numa tabela compartilhada; ao abrir, se tiverem mais de 30 dias, atualiza; a tarefa agendada atualiza tudo que passar de 150 dias e apaga o que não é usado por ninguém. Diário, listas e notas apontam para esse catálogo. Responde rápido, funciona com o TMDB fora do ar e cumpre os 6 meses.
2. **Sempre ao vivo do TMDB.** Nada guardado além do id; toda tela chama o TMDB. Mais simples, mas diário e listas ficariam lentos (uma chamada por pôster) e sem nada quando o TMDB cair. Descartada.
3. **Copiar e nunca atualizar.** Fere o limite de 6 meses e deixa "onde assistir" errado. Descartada.

## Como funciona

### Busca e adição

- `/plots/buscar`: campo grande; resultados do TMDB (filmes e séries, em pt-BR) como pôsteres com título, ano e tipo. Tocar abre a página do título (que grava o título no catálogo).
- Na página do título, as ações principais: **"Assistimos"** (abre a folha de registro; em série, já com a temporada escolhida) e **"Quero ver"**.
- O "+" de Plots (selo quadrado sobre a barra, o equivalente ao carimbo de Plates) leva à busca.

### Tipo do título

O tipo vem do TMDB: `movie` → filme, `tv` → série; gênero Documentário → documentário; gênero Animação com idioma original japonês → anime. "Especial" (stand-up, show, especial de TV) e qualquer correção são escolhidos na página do título por quem estiver logado — o catálogo é público e a classificação é só um rótulo.

### Diário e registros

- Folha de registro: data (hoje por padrão), nota em meia estrela (opcional), review, curtida, "reassistido" (marcado sozinho se já houver registro anterior do mesmo filme ou da mesma temporada), privado. Em série: escolha da temporada.
- `/plots` (Diário): meses em ordem decrescente; em cada mês, os registros como linha de cartaz — pôster pequeno, título (e "T2" em série), e a linha de créditos com dia, nota, curtida e "reassistido". Número de catálogo "Sessão nº 0087". Topo com o total do ano (sessões, horas assistidas).
- A **nota do filme** que aparece no resto do app é a do registro mais recente com nota; a **nota da temporada**, idem; a **nota da série** é dada à parte, na página da série, com a média das temporadas como sugestão (`suggestSeriesRating`). Mudar a nota direto na página atualiza essa nota sem criar registro.

### Página do título (`/plots/t/[id]`)

Fundo (backdrop) com o pôster por cima, título em caixa alta amarela, linha de créditos (ano · duração ou temporadas · gêneros · tipo). Blocos: sua nota (selo) e curtida; ações; sinopse; créditos (direção/criação e elenco principal); **Onde assistir** (logos dos serviços por assinatura, aluguel e compra, com destaque para os do perfil e "Dados: JustWatch"); **Temporadas** (série: cada temporada com sua nota e o botão de registrar); **Seus registros** (histórico); favoritar (Top 4) e pôr em lista. Rodapé com a atribuição ao TMDB.

### Quero ver (`/plots/quero-ver`)

Grade de pôsteres 2:3 (três colunas), com a faixa "No seu Netflix" (ou outro serviço do perfil) quando estiver disponível; filtro "só nos meus streamings" e por tipo; ordem por data em que entrou ou por título. "Assistimos!" no pôster abre o registro e tira da lista ao salvar.

### Top 4 e listas

- Top 4: no perfil de Plots, quatro molduras de pôster; escolher pela busca entre títulos já registrados ou qualquer título do TMDB; reordenar.
- Listas (`/plots/listas`, `/plots/listas/[id]`): nome, descrição, privada ou pública; itens em ordem com nota curta opcional; adicionar a partir da página do título; reordenar e tirar.

### Navegação de Plots

Barra inferior: Diário · Quero ver | alternador | Listas · Perfil; o "+" (busca) flutua acima, à direita.

## Dados

| Tabela | Campos principais |
| --- | --- |
| `titles` (catálogo TMDB) | `tmdb_type` (`movie`/`tv`) + `tmdb_id` (únicos juntos), `kind`, título, título original, ano, duração (min), sinopse, `poster_path`, `backdrop_path`, `genres[]`, `credits` (direção/criação, elenco principal), nº de temporadas, `providers` (BR: assinatura/aluguel/compra + link), `fetched_at` |
| `seasons` | título, número, nome, nº de episódios, ano, `poster_path`; único (título, número) |
| `watch_logs` | pessoa, título, `season_number` (só série), data, nota, review, `liked`, `rewatch`, `together` (falso até a fase 4), `is_private` |
| `title_ratings` | pessoa + título (único): nota atual do filme ou da série inteira, `liked`, `is_private` |
| `season_ratings` | pessoa + título + temporada (único): nota atual da temporada |
| `watchlist` | pessoa + título (único), nota curta, data de entrada |
| `custom_lists` / `list_items` | dona, nome, descrição, `is_private`; itens com posição e nota curta |
| `favorite_titles` | pessoa, posição 1–4 (única), título |

Notas em `numeric(2,1)` com o mesmo `check` de Plates. Médias de casal e comunidade nunca guardadas.

### Permissões (RLS)

- `titles`, `seasons`: qualquer pessoa logada lê; só a API grava (como dona das tabelas), exceto a troca de `kind`, feita pela rota da API.
- `watch_logs`, `title_ratings`, `season_ratings`: dono faz tudo; outros leem só o que não é privado.
- `watchlist`: só o dono (o par entra na fase 4).
- `custom_lists`, `list_items`: dono faz tudo; outros leem as listas públicas.
- `favorite_titles`: dono grava; qualquer pessoa logada lê (vai para o perfil público na fase 4).
- `anon` sem acesso; `GRANT`s explícitos.

## API

- `GET /v1/tmdb/search?q=&page=` → resultados (não grava nada).
- `GET /v1/titles/by-tmdb/:type/:tmdbId` → grava/atualiza no catálogo e devolve o id; `GET /v1/titles/:id` → página do título (com as notas, registros e listas de quem vê; atualiza se tiver mais de 30 dias); `PATCH /v1/titles/:id/kind`.
- `POST /v1/titles/:id/logs`, `PATCH|DELETE /v1/logs/:id`; `GET /v1/diary?year=&cursor=` (agrupável por mês).
- `PUT|DELETE /v1/titles/:id/rating`, `PUT|DELETE /v1/titles/:id/seasons/:n/rating`.
- `PUT|DELETE /v1/titles/:id/watchlist`, `GET /v1/watchlist?onlyMine=&kind=&sort=`, `POST /v1/titles/:id/assistimos`.
- `GET|PUT /v1/me/favorites` (lista de 4 ids ordenada).
- CRUD de `/v1/lists` e itens.
- Chamadas ao TMDB com o token v4 no servidor, `language=pt-BR`, `region=BR`, timeout, rate limit por usuário e cache em memória das buscas (10 min).

Tarefa agendada nova (dentro da API, como o ping e o backup): toda madrugada, atualiza até 200 títulos com `fetched_at` acima de 150 dias e apaga títulos que ninguém usa há mais de 150 dias.

Variável: `TMDB_ACCESS_TOKEN` (sem ela, a busca avisa que o TMDB não está configurado; no modo local há títulos de exemplo).

## Modo local e seed

Sem token no modo local, a busca responde com um catálogo de exemplo (fixtures). As contas `ana` e `bia` ganham registros de exemplo (filmes e temporadas de séries), uma lista e o Top 4; os pôsteres usam a arte de cartaz do mundo quando a imagem não carrega.

## Testes

- `shared`: tipo do título a partir do TMDB, "reassistido" automático, sugestão da nota da série, schemas novos.
- `db`: RLS de cada tabela nova (privado, público, dono, anon).
- `api`: rotas com TMDB falso (busca, gravação no catálogo, atualização por idade, registro de temporada atualiza a nota da temporada, Assistimos! tira do quero ver, Top 4 com no máximo 4 e sem repetição, listas privadas invisíveis para outros, tarefa de atualização respeitando os 150 dias).
- Navegador: buscar → registrar filme e temporada → diário agrupado por mês → quero ver com destaque de streaming → Assistimos! → Top 4 no perfil → lista; celular e computador, movimento reduzido, CPU 4x.

## Design

Telas no mundo "Cartaz" de `apps/web/DESIGN.md`, desenhadas com a skill `impeccable` antes do código (diário, busca, página do título, quero ver, listas, Top 4). Não copiar marca, cores ou layout do Letterboxd. Animações só com `transform` e `opacity`; a curva `POP` para curtida e "Assistimos!".

## Fica a critério de quem constrói

- Tamanhos de imagem do TMDB por lugar (ex.: `w185` em listas, `w342` na grade, `w780` no fundo).
- Quantos nomes de elenco mostrar e quais funções contam como "direção/criação".
- Formato exato do cursor do diário e tamanho das páginas.
