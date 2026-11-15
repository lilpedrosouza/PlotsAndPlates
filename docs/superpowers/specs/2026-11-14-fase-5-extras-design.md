# Fase 5 — Wrapped, sorteio e conquistas

Data: 2026-11-14. Base: documento do projeto (seção 4, "Funcionalidades extras", e seção 5, design e animações), fases 1–4 e as respostas de 2026-11-14.

## Para quê

Os três extras transformam o diário em memória e em decisão: o **Wrapped** devolve ao casal o ano que eles registraram; o **"O que a gente faz hoje?"** tira da lista de vontade a dúvida de onde ir ou o que ver; as **conquistas** celebram marcos do uso. Tudo continua pessoal e a dois — sem feed, sem ranking entre usuários.

## Objetivos

- **PAP Wrapped** do casal, em stories animados, com os números do ano (Plates, Plots e o casal), disponível o ano todo ("até agora" no ano corrente) e anos anteriores guardados para rever; cada story pode virar imagem para compartilhar.
- **Sorteio** a partir do quero ir (Plates) e do quero ver (Plots), com filtros e uma animação de cartas.
- **Conquistas**: catálogo fixo nos dois mundos, desbloqueadas na hora do registro, guardadas para sempre, com animação de desbloqueio.
- Topo do diário com "sessões e horas do ano" vira parte do Wrapped (pendência da fase 3).

## Fora desta fase

- Ranking ou comparação entre casais, conquistas raras "globais", notificações push/e-mail.
- Wrapped individual de quem não tem par como produto separado (quem não tem par vê o Wrapped só com os próprios números, sem os stories do casal).
- Passada final de performance e Lighthouse: fase 6.

## Não pode acontecer

- Uma conquista ganha sumir (apagar um registro não "desganha").
- O Wrapped ou as conquistas mostrarem a terceiros algo privado (o Wrapped é só do casal; badges públicas não revelam o conteúdo que as gerou).
- O sorteio repetir sempre o mesmo item ou sortear algo fora dos filtros.
- Animação que trave no celular intermediário (só `transform`/`opacity`, versão reduzida com `prefers-reduced-motion`).

## Decisões já tomadas (respostas de 2026-11-14)

- Wrapped **do casal**, sempre disponível; o ano corrente aparece como "até agora"; anos anteriores ficam para rever; aviso especial em dezembro.
- "Só itens compartilhados" no sorteio = itens que **os dois** adicionaram ("pelos dois").
- Conquistas: catálogo proposto aqui (abaixo), revisado pelo dono antes de construir.
- Conquistas **desbloqueadas na hora** (depois de cada ação que conta), **guardadas para sempre** com a data.

## Abordagens consideradas para as conquistas

1. **Na hora, guardadas (escolhida).** Depois de cada ação que conta (visita, nota, registro, Top 4, vínculo), a API confere as regras de quem agiu (e do par, nas conquistas do casal) e grava as novas com a data. O site mostra a animação logo em seguida. Ganha para sempre.
2. **Calculadas ao abrir, sem guardar.** Mais simples, mas sem data confiável, animação só ao abrir a tela e apagar um registro "desganha".
3. **Uma vez por dia.** Tarefa agendada; sem animação na hora.

## Como funciona

### PAP Wrapped

- Rota `/plates/wrapped/[ano]` e `/plots/wrapped/[ano]` (espelhadas: trocar de mundo mantém o Wrapped). Tela cheia, por cima da navegação.
- Entradas: cartão "Seu ano no PAP" no perfil (Plates e Plots) com o ano corrente e os anteriores que têm dados; em dezembro e na primeira semana de janeiro, um aviso no topo do caderno e do diário.
- **Stories** (cada um é uma tela; avançam sozinhos a cada ~6 s com barra de progresso no topo; tocar à direita avança, à esquerda volta, segurar pausa; teclado ← →; movimento reduzido: sem avanço automático e troca por dissolve). Os stories alternam os dois mundos (Plates no papel creme, Plots no preto de cinema):
  1. **Abertura** — "2026 de Ana & Bia" (ou "até agora"), com os avatares do casal.
  2. **Plates em números** — restaurantes diferentes, visitas, pratos pedidos.
  3. **Cozinha favorita** — a cozinha mais frequente nas visitas do ano, e o restaurante mais visitado.
  4. **Campeão da mesa** — o restaurante de maior média do casal no ano (e a nota de cada um).
  5. **Plots em números** — sessões, horas assistidas, títulos diferentes, sessões "juntos".
  6. **Gênero favorito** — o gênero mais frequente nas sessões, e o título mais visto (mais sessões).
  7. **Campeão da tela** — o título de maior média do casal no ano.
  8. **Onde vocês concordaram** — o item (restaurante ou título) com as duas notas iguais ou mais próximas, e quantas notas iguais no ano.
  9. **Onde vocês discordaram** — o item com a maior diferença entre as notas (as duas notas lado a lado).
  10. **Conquistas do ano** — as desbloqueadas no ano (até 6) e o total.
  11. **Encerramento** — resumo em uma tela e "Compartilhar".
  Story sem dado (ex.: ninguém avaliou nada em comum) é pulado. Sem par: só os stories 2–7 e 10–11 com os números da pessoa.
- **Contas** (sempre calculadas, nunca guardadas; período = datas de visita/sessão dentro do ano):
  - Visitas do casal = visitas dos dois no ano (a "juntos" conta uma vez, é uma linha só).
  - Pratos pedidos = pratos distintos ligados às visitas do ano.
  - Cozinha favorita = a cozinha que mais aparece nas visitas do ano (empate: a de maior nota média).
  - Sessões do casal = registros dos dois no ano, contando uma vez cada par espelhado (mesmo `group_id`).
  - Horas assistidas = soma da duração das sessões (filme: `runtime`; temporada: episódios × duração do episódio; sem dado, não soma).
  - Médias do casal = `coupleRating`; "iguais" = diferença 0; itens considerados = restaurantes com visita no ano e títulos com sessão no ano em que os dois têm nota.
- **Quem entra no Wrapped de um ano** *(decisão de quem constrói)*: o casal de agora. O Wrapped de qualquer ano junta os registros dos dois naquele ano, mesmo de antes do vínculo (o par já vê tudo do outro, inclusive o privado); visitas "juntos" com um par antigo contam só para quem registrou. Depois de desfazer o vínculo, todos os anos viram o Wrapped só da pessoa.
- **Notas comparadas** *(decisão de quem constrói)*: restaurantes pela nota geral (`restaurant_ratings.overall`) e títulos pela nota atual do título (`title_ratings`), não por sessão. Os stories 8 e 9 olham restaurantes e títulos; as conquistas do casal olham também pratos.
- **Compartilhar como imagem**: o story na tela vira PNG 1080×1920 gerado no próprio aparelho e vai para o compartilhamento do sistema (Web Share API com arquivo); sem suporte, baixa o arquivo.
- API: `GET /v1/wrapped/:year` → `Wrapped` (tipo no shared) com o que cada story precisa; `GET /v1/wrapped` → anos com dados. Só para quem pede e o par (é o Wrapped do casal de agora; privados entram, porque são do casal).

### "O que a gente faz hoje?"

- Botão no topo do quero ir e do quero ver. Abre uma folha em tela cheia com os filtros e o baralho:
  - Plates: cozinha, faixa de preço ($ a $$$$), "só o que os dois adicionaram".
  - Plots: tipo (filme, série, documentário, anime, especial), duração (até 1h30, até 2h, qualquer; série conta a duração do episódio), "só nos meus streamings" (os do perfil de quem está sorteando, como no filtro do quero ver), "só o que os dois adicionaram".
- Animação: as cartas dos itens filtrados embaralham (deslizam e giram com `transform`) e uma vira, revelando o sorteado (foto/rótulo em Plates, pôster em Plots). Ações: "Bora!" (Plates abre o restaurante; Plots abre o título), "Sortear de novo" (não repete os últimos sorteados até acabar a lista), "Fomos!"/"Assistimos!" direto.
- Lista vazia depois dos filtros: mensagem e atalho para limpar filtros. Um item só: revela direto.
- Roda no aparelho, sobre os dados que o site já tem das listas do casal (prioridade não pesa no sorteio).

### Conquistas

- Catálogo fixo no código (`packages/shared`): chave, mundo (Plates, Plots, casal), nome, descrição, meta numérica. No banco, só `user_achievements` (`user_id`, `key`, `unlocked_at`, `seen_at`), com RLS (dono lê; par lê; terceiros leem as desbloqueadas para o perfil público) e escrita só pela API.
- Avaliação: função da API `checkAchievements(userId)` que calcula as contagens de quem agiu e grava as que bateram a meta (sem duplicar). Chamada depois de: criar/editar visita, avaliar restaurante ou prato, registrar/editar sessão, Assistimos!, nota de título/temporada, Top 4, aceitar convite. Nas conquistas do casal, confere os dois.
- **Visita "juntos" conta para os dois** *(decisão de quem constrói)*: está no caderno dos dois, então conta nas conquistas de Plates de cada um; criar/editar uma visita "juntos" confere também o par.
- **Quem já tem dados** *(decisão de quem constrói)*: na primeira conferência de cada pessoa depois do lançamento, tudo o que já foi alcançado é desbloqueado com a data daquele dia; essas chegam juntas numa só animação ("Vocês já tinham 6 conquistas!") em vez de uma por uma. Não há migração de dados.
- **Notas que contam** *(decisão de quem constrói)*: "Crítico exigente" usa notas de restaurante (geral) e de título (atual); "Almas gêmeas" e "Opiniões fortes" comparam restaurante (geral), prato e título (atual) que os dois avaliaram.
- Site: depois dessas ações o site recarrega as conquistas; as que têm `seen_at` vazio disparam a **animação de desbloqueio** (o selo cai e carimba em Plates; acende como letreiro em Plots; movimento reduzido: dissolve) e são marcadas como vistas.
- Telas: bloco "Conquistas" no perfil (Plates e Plots) com as ganhas e as que faltam com progresso ("7 de 10 cozinhas"); no perfil público, as ganhas (sem progresso) **menos as do casal**, que diriam a terceiros quem tem par *(decisão de quem constrói)*.

**Catálogo proposto (16):**

| Mundo | Nome | Regra |
| --- | --- | --- |
| Plates | Primeira mesa | 1 visita registrada |
| Plates | Volta ao mundo | restaurantes de 10 cozinhas diferentes visitados |
| Plates | Freguês | 5 visitas ao mesmo restaurante |
| Plates | Explorador de bairros | restaurantes visitados em 5 bairros diferentes |
| Plates | Sobremesa sempre | 10 sobremesas avaliadas |
| Plates | Caderno cheio | 25 restaurantes visitados |
| Plots | Primeira sessão | 1 sessão registrada |
| Plots | Cinéfilo | 50 filmes registrados |
| Plots | Maratonista | 3 temporadas da mesma série registradas em até 7 dias |
| Plots | Documentarista | 10 documentários registrados |
| Plots | Top 4 | Top 4 completo |
| Ambos | Crítico exigente | 20 notas dadas (restaurantes e títulos) com média até 3 |
| Casal | Almas gêmeas | 10 notas iguais às do par no mesmo restaurante, prato ou título |
| Casal | Juntos sempre | 25 visitas ou sessões "juntos" |
| Casal | Opiniões fortes | 5 itens com 2 estrelas ou mais de diferença entre as notas do casal |
| Casal | Primeiro encontro no PAP | vínculo de casal aceito |

"Maratonista" muda o exemplo do documento ("temporada inteira em uma semana") porque o PAP registra temporadas, não episódios: 3 temporadas em 7 dias é o equivalente medível.

## Dados e permissões

| Mudança | Detalhe |
| --- | --- |
| `user_achievements` | `user_id`, `key` (texto do catálogo), `unlocked_at`, `seen_at`; único por (`user_id`, `key`); RLS + `GRANT` só de leitura e de `update` de `seen_at` pelo dono via API |
| Sem tabela `achievements` | o catálogo vive no código (versão com o app); o documento sugeria a tabela, mas ela só repetiria o código |
| Wrapped e sorteio | sem tabelas novas |

## API (novas rotas)

- `GET /v1/wrapped`, `GET /v1/wrapped/:year`.
- `GET /v1/me/achievements` (catálogo + progresso + desbloqueadas), `POST /v1/me/achievements/seen` `{keys}`, `GET /v1/profiles/:username/achievements` (só as desbloqueadas).

## Testes

- `shared`: catálogo (chaves únicas, metas), cálculo de horas, escolha de cozinha/gênero favorito com empate.
- `db`: RLS de `user_achievements` (terceiro não escreve, não vê `seen_at` de outro).
- `api`: Wrapped com casal (visita juntos conta uma vez, espelho conta uma vez, horas, concordância/discordância, ano sem dados, sem par), conquistas (destrava na ação, não duplica, não some ao apagar, casal destrava para os dois, perfil público só desbloqueadas).
- Navegador: Wrapped no celular (toques, segurar, teclado, imagem gerada), sorteio com filtros e "sortear de novo", desbloqueio animado; movimento reduzido e CPU 4x.

## Design

Telas novas com a skill `impeccable`, dentro de "Rótulo & Cartaz": o Wrapped é o momento mais expressivo do app (cada story é um cartaz do mundo dele, números grandes, passagem entre mundos com a transição marcante); o sorteio é um baralho de rótulos (Plates) ou de pôsteres (Plots); as conquistas são selos carimbados (Plates) e placas de letreiro (Plots). Nada de marca, cores ou layout de Spotify Wrapped ou Letterboxd.

## Fica a critério de quem constrói

- Textos dos stories, das conquistas e dos avisos (tom informal, "a gente").
- Tempo de cada story (sugestão: 6 s) e ilustrações geométricas dos stories sem foto.
- Biblioteca para virar o story em imagem (gerada no aparelho).
- Ordem exata dos stories e o que mostrar quando um dado está vazio.
