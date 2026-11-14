# Fase 4 — Casal, perfis e comunidade

Data: 2026-11-14. Base: documento do projeto (seção 1: vínculo de casal, perfil visível, busca, "O que o pessoal do PAP achou", avaliação privada), fases 1–3 e as respostas de 2026-11-14.

## Para quê

O PAP é o diário **a dois**: cada um dá a própria nota e o app mostra as duas lado a lado com a média do casal; o que um registra "juntos" aparece para os dois; as listas de vontade são uma só. Para fora, dá para achar outra pessoa, ver o perfil dela e o que o pessoal achou de um lugar ou título — sem feed nem seguidores.

## Objetivos

- Convite de par: uma pessoa convida outra (pelo @username); o par só existe depois do aceite. Cada pessoa tem no máximo um par. Dá para desfazer.
- "Juntos" em visitas (Plates) e sessões (Plots), aparecendo para os dois.
- Notas lado a lado (você · par · média do casal) no restaurante, nos pratos, no título e nas temporadas.
- Quero ir e quero ver do casal: uma lista por seção, com "adicionado por" em cada item.
- Avaliação privada passa a ser vista também pelo par.
- O par edita os restaurantes que o outro cadastrou (e os pratos).
- Busca de pessoas por nome ou @username; perfil público só de leitura (Plates e Plots).
- "O que o pessoal do PAP achou" nas páginas de restaurante e de título.

## Fora desta fase

- Feed, seguir, curtir avaliação de outra pessoa, comentários: o documento exclui.
- Notificações por e-mail/push do convite: o convite aparece no app (aviso no topo do caderno/diário e no perfil).
- Wrapped, sorteio e conquistas: fase 5.

## Não pode acontecer

- Alguém ver a avaliação privada de quem não é seu par.
- Desfazer o vínculo apagar dados de alguém.
- Uma pessoa estar em dois casais ao mesmo tempo.
- Aparecer no perfil público ou na comunidade algo privado.

## Decisões já tomadas

- "Juntos" aparece para os dois; cada um dá a própria nota depois (resposta de 2026-11-14).
- Quero ir / quero ver: uma lista do casal por seção; "Fomos!"/"Assistimos!" de qualquer um tira o item para os dois; ao desfazer o vínculo, cada item volta para quem adicionou (resposta de 2026-11-14).
- Restaurantes favoritos do perfil = os de maior nota geral da pessoa, só avaliações públicas (resposta de 2026-11-14).
- Padrões das fases 1–3 (RLS + `GRANT` explícito, API como única porta, testes PGlite, mundos "Rótulo & Cartaz").

## Abordagens consideradas para o "juntos"

1. **Plates: visita única compartilhada; Plots: sessão espelhada (escolhida).** Em Plates a nota é por restaurante e por prato (não por visita), então uma visita só, vista e editável pelos dois, basta: fotos e pratos não se duplicam. Em Plots a nota vive no registro da sessão; por isso marcar "juntos" cria também o registro do par (mesma data e temporada, sem nota, ligados por um `group_id`), e cada um preenche a própria nota, curtida e review.
2. **Espelhar também em Plates.** Duplicaria fotos e pratos; apagar uma foto de um lado quebraria o outro. Descartada.
3. **Registro único também em Plots.** Uma sessão com duas notas exigiria mudar o diário inteiro (nota fora do registro). Descartada.

## Como funciona

### Par

- Tabelas `couple_members` (um casal, duas pessoas; cada pessoa em no máximo um casal) e `couple_invites` (de, para, situação: pendente, aceito, recusado, cancelado).
- Função `public.partner_of(uid)` (security definer) usada pelas policies.
- No perfil (Plates e Plots), bloco **"Par"**: sem par → convidar pelo @username; convite enviado → cancelar; convite recebido → aceitar ou recusar; com par → nome e foto do par e "Desfazer vínculo" (com confirmação). Convite recebido aparece também como aviso no topo do caderno e do diário.
- Aceitar recusa automaticamente outros convites pendentes das duas pessoas.

### "Juntos"

- **Plates:** a folha de visita ganha "Fomos juntos" (ligado por padrão quando há par). A visita aparece no caderno dos dois; o restaurante entra no caderno do par. Os dois editam; apagar por quem não registrou só tira a visita do caderno dele (desmarca o "juntos").
- **Plots:** a folha de registro ganha "Vimos juntos" (ligado por padrão quando há par). Cria o registro do par na mesma data/temporada, sem nota. No diário do par aparece com "juntos" e sem nota, pronto para ele avaliar.

### Notas lado a lado

- Restaurante: na tabela de informação, colunas "você · par · casal" por critério e na nota geral; carimbos "você", "par" e "casal" (`coupleRating`).
- Pratos: o ranking passa a usar as notas dos dois; cada prato mostra as duas notas.
- Título e temporadas: selo "você", "par" e "casal".
- Caderno e diário continuam mostrando a nota de quem está vendo.

### Listas do casal

- Os itens continuam guardados por quem adicionou; a lista do casal é a união das duas, um item por restaurante/título, com "adicionado por Ana" (ou "pelos dois").
- "Fomos!"/"Assistimos!" e "tirar da lista" de qualquer um removem o item dos dois.
- Ao desfazer o vínculo, cada um volta a ver só o que adicionou.

### Pessoas e perfil público

- `/plates/pessoas` e `/plots/pessoas`: busca por nome ou @username (rota de API já existe).
- `/plates/u/[username]` e `/plots/u/[username]`: capa, foto, nome, @, bio; em Plates, estatísticas (restaurantes, visitas, nota média), **restaurantes favoritos** (até 4 de maior nota pública) e **avaliações recentes**; em Plots, estatísticas (sessões, títulos), **Top 4** e **sessões recentes** com nota. Só o que é público (o par vê também o privado). Botão "Convidar para ser meu par" quando faz sentido.

### "O que o pessoal do PAP achou"

- Na página do restaurante e na do título: média da comunidade (`communityRating`, sem você e sem seu par), quantas avaliações, e as avaliações públicas mais recentes (foto, nome, nota, review, data), com link para o perfil. Paginado de 10 em 10.

## Dados e permissões

| Mudança | Detalhe |
| --- | --- |
| `couple_members` | `couple_id`, `user_id` (único); casal com exatamente 2 pessoas, criado só pela API ao aceitar |
| `couple_invites` | `from_user`, `to_user`, `status`, datas; um pendente por par de pessoas |
| `watch_logs.group_id` | liga a sessão espelhada do par |
| `can_edit_restaurant` | quem cadastrou **ou o par** |
| Policies de leitura | privado visível ao dono **e ao par** (notas de restaurante e prato, registros, notas de título/temporada, listas personalizadas) |
| `visits` | leitura e edição: dono ou par quando `together` |
| `restaurant_wishlist`, `watchlist` | leitura e exclusão: dono ou par |

## API (novas rotas)

- `GET /v1/couple` (par, convites enviados e recebidos), `POST /v1/couple/invites` `{username}`, `POST /v1/couple/invites/:id/accept|decline|cancel`, `DELETE /v1/couple`.
- Visitas e registros aceitam `together`; respostas trazem `together`, `addedBy`/`registeredBy` e, onde houver, a nota do par e a média do casal.
- `GET /v1/restaurants/:id/community?cursor=` e `GET /v1/titles/:id/community?cursor=`.
- `GET /v1/profiles/:username/plates` e `/plots` (estatísticas, favoritos, recentes).

## Testes

- `db`: RLS com par (privado visível ao par e não a terceiros; visita "juntos" visível e editável pelo par; listas do casal), unicidade do casal.
- `api`: convite (aceitar, recusar, cancelar, convidar quem já tem par → 409, convidar a si mesmo → 400), desfazer vínculo sem perder dados, "juntos" em Plates e Plots, notas lado a lado e média, listas do casal e Fomos!/Assistimos! removendo para os dois, comunidade sem você/par e sem privadas, perfil público sem privadas.
- Navegador: convite Ana → Bia, aceite, visita e sessão juntos aparecendo para os dois, notas lado a lado, lista do casal, perfil público, comunidade; celular e computador.

## Design

Telas novas e blocos novos nos dois mundos com a skill `impeccable`, dentro de "Rótulo & Cartaz": colunas "você · par · casal" na tabela de informação do rótulo e nos créditos do cartaz; o par aparece com a cor de destaque dele quando houver.

## Fica a critério de quem constrói

- Texto exato dos avisos de convite e confirmações.
- Quantas avaliações recentes no perfil (sugestão: 6) e tamanho da página da comunidade.
- Como mostrar "adicionado por" (avatar pequeno ou nome em letra miúda).
