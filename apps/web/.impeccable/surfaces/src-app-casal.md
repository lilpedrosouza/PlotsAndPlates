---
version: 1
slug: "src-app-casal"
primary_target: "src/components/couple"
related_targets: ["src/components/people", "src/app/plates/(app)/pessoas", "src/app/plots/(app)/pessoas", "src/app/plates/(app)/u", "src/app/plots/(app)/u"]
---

# Casal, pessoas e comunidade (fase 4)

Escopo: bloco Par no perfil (Plates e Plots), aviso de convite no topo do caderno e do diário, "juntos" nas folhas de visita e de registro, notas lado a lado (você · par · casal), "adicionado por" nas listas de vontade, busca de pessoas, perfil público e "O que o pessoal do PAP achou". Modo: Operate. Público: o casal no celular; de vez em quando, alguém de fora olhando um perfil. Refinamento dos mundos "Rótulo" e "Cartaz" (`src-app.md`, `DESIGN.md`), sem redesenho: cada peça existe uma vez e muda de forma com o mundo.

Momento memorável: **o casal como letreiro.** Em Plates o par é a "mesa para dois" do cardápio: os dois nomes em Besley ligados por um "&" em itálico grande na cor de destaque, os dois avatares redondos sobrepostos como dois carimbos. Em Plots é a linha de faturamento do cartaz: "ESTRELANDO" em letra miúda e os dois nomes em Jost caixa alta lado a lado, avatares quadrados encostados. É o mesmo componente, com a forma do mundo.

## Decisões

- **Bloco Par (perfil):** bloco de tela aberto por fio, título "Par". Quatro estados:
  - sem par: campo com prefixo "@" (padrão de campo do mundo) e botão "Convidar"; linha de apoio "O par vê suas avaliações privadas e vocês dividem o quero ir e o quero ver.";
  - convite enviado: letreiro com o seu nome e "@fulano?" em tinta suave, "Esperando resposta" e botão discreto "Cancelar convite";
  - convite recebido: letreiro com os dois nomes, "Fulano quer ser seu par" e os botões "Aceitar" (principal) e "Recusar" (secundário);
  - com par: letreiro, "Juntos no PAP desde nov. 2026" em letra miúda, link para o perfil público do par e botão destrutivo pequeno "Desfazer vínculo", que abre confirmação ("Ninguém perde nada: cada um fica com o que registrou.").
- **Aviso de convite (caderno e diário):** faixa fina no topo da lista, antes do primeiro registro, com o avatar de quem convidou, "Fulano te convidou para ser par" e "Aceitar" / "Recusar". Plates: folha `surface` com moldura de rótulo; Plots: faixa `surface` com fio forte e texto em caixa alta miúda. Some com dissolve ao responder.
- **"Fomos juntos" / "Vimos juntos":** linha de alternância na folha, logo depois da data, com o avatar do par à direita; ligada por padrão quando há par; sem par, a linha não aparece.
- **Visita registrada pelo par:** na linha da visita, letra miúda "registrada por Bia" com mini-avatar de 16px; "juntos" como etiqueta pequena.
- **Notas lado a lado — Plates:** a tabela de informação do rótulo ganha colunas "Você · Bia · Casal" (cabeçalho em letra miúda caixa alta, números tabulares alinhados à direita); a nota geral fica na última linha com fio duplo acima. Os carimbos: o seu na cor de destaque, o do par em tinta com a cor de destaque dele no contorno, o do casal maior, em tinta. Pratos: cada linha mostra as duas notas pequenas ("você 4 · Bia 4,5").
- **Notas lado a lado — Plots:** três selos quadrados em linha na página do título: "VOCÊ" (amarelo cheio), "BIA" (contorno na cor de destaque dela, ou fio forte se não houver), "CASAL" (tinta clara sobre `sunken`). Em cada temporada, as duas notas em letra miúda depois das estrelas.
- **"Adicionado por":** no rodapé de cada item do quero ir / quero ver, mini-avatar(es) de 16px e "por Bia" ou "pelos dois" em letra miúda; nunca compete com o motivo ou o streaming.
- **Juntos no diário (Plots):** na linha de créditos da sessão, "JUNTOS" como uma palavra a mais; sessão espelhada sem nota mostra "Dar nota" no lugar do selo.
- **Pessoas (`/plates/pessoas`, `/plots/pessoas`):** campo grande de busca no topo ("Nome ou @username"), resultado em linhas: avatar 40px, nome, @ em tinta suave; seu par marcado com "par". Vazio antes de digitar: uma linha explicando que dá para ver o perfil e as avaliações públicas, sem feed nem seguidores.
- **Perfil público (`/plates/u/[username]`, `/plots/u/[username]`):** capa e avatar como no próprio perfil, nome, @, bio. Plates: três números como uma linha de cardápio (restaurantes · visitas · nota média), "Favoritos" em grade 2×2 de rótulos pequenos (arco 4:5 + nome + carimbo) e "Avaliações recentes" em linhas (nome do lugar, carimbo, review curta em itálico, data). Plots: créditos (sessões · títulos · nota média), Top 4 em linha de quatro pôsteres e "Sessões recentes" como as linhas do diário. Botão "Convidar para ser meu par" quando nenhum dos dois tem par; quando é o seu par, etiqueta "seu par".
- **"O que o pessoal do PAP achou":** bloco de tela no fim da página do restaurante e do título. Cabeçalho com a média da comunidade grande (número tabular, até duas casas, `formatRating`) e "de N avaliações". Lista de avaliações: avatar 32px, nome (link para o perfil), nota (carimbo pequeno em Plates, selo em Plots, "T2" quando for temporada), review e data em letra miúda. "Ver mais" carrega de 10 em 10. Vazio: "Ninguém de fora avaliou ainda." em tinta suave.
- **Avatar:** redondo em Plates, quadrado de canto vivo em Plots; sem foto, a inicial sobre a cor de destaque da pessoa.
- **Movimento:** aviso e itens que somem dissolvem; aceitar o convite assenta o letreiro com a mola `settle`; movimento reduzido só dissolve.
