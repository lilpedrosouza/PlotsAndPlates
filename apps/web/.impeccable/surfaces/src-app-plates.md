---
version: 1
slug: "src-app-plates"
primary_target: "src/app/plates"
related_targets: ["src/components/plates"]
---

# Plates completo (fase 2)

Escopo: caderno (fomos / quero ir, grade e índice, filtros), cadastro de restaurante (busca Google/OSM, link do Maps, manual), página do restaurante (notas por critério, pratos, visitas, painel do Google), folhas de avaliação, visita e prato, mapa. Modo: Operate. Público: o casal, no celular, com uma mão, muitas vezes ainda na mesa. Tarefa principal: registrar uma saída em menos de um minuto; tarefa secundária: reencontrar o que achou. Refinamento do mundo "Rótulo & Cartaz" (ver `src-app.md` e `DESIGN.md`), sem redesenho.

Momento memorável: o rótulo do caderno se expande até virar a página do restaurante (o arco da foto viaja), e na página a avaliação aparece como a tabela de informação de um rótulo de mercearia, fechada pelo carimbo da nota geral.

## Decisões

- **Caderno = prateleira de rótulos.** Grade de duas colunas no celular (três a partir de 768px) com a coluna da direita deslocada 1,5rem para baixo, como potes numa prateleira; cada item é um rótulo (moldura de rótulo, arco 4:5, fio duplo, nome em Besley, letra miúda com bairro · cozinha · preço, carimbo pequeno com a nota). O giro do carimbo varia levemente por restaurante (−8° a −3°). Sem foto, a ilustração do prato em duas tintas.
- **Índice do caderno.** A alternativa à grade é o índice de um caderno de receitas: nome em Besley, pontilhado até a nota, letra miúda embaixo. Uma linha por restaurante; é a vista para listas longas (virtualizada a partir de 40 itens).
- **Abas "Fomos" e "Quero ir"** no topo, em letra miúda grande com contagem; "Quero ir" também é destino da barra inferior. No "quero ir", o rótulo mostra o motivo em itálico e a prioridade em letra miúda, com o botão "Fomos!".
- **Filtros** numa folha inferior (cozinha, bairro/cidade, preço, nota mínima, ordem); os filtros ligados aparecem como etiquetas removíveis abaixo das abas. Filtros na URL.
- **Barra inferior de Plates:** Caderno · Mapa · alternador · Quero ir · Perfil; o "+" é um carimbo redondo flutuante acima da barra, à direita (o círculo é o gesto de carimbar).
- **Página do restaurante:** arco grande com o carimbo da nota sobreposto no canto; nome, letra miúda de lugar; ações (principal: "Avaliar" ou "Fomos!"; secundárias: "Nova visita", "Editar"). Blocos: "Nossas notas" como tabela de informação (critério, estrelas, número, fio forte, nota geral em carimbo), review em citação; "Pratos" como cardápio numerado com pontilhado até a nota; "Visitas" como linha do tempo com "Visita nº 0002"; "Sobre o lugar" com endereço, telefone, site, horário e atribuição do OpenStreetMap; "Ver no Google" como folha anexada que só carrega ao tocar.
- **Cadastro:** um campo grande ("Nome do restaurante ou link do Maps"), sugestões como linhas do índice, selo "Google" quando vier do Google, aviso discreto quando cair no OSM, "Cadastrar à mão" sempre visível. O rascunho vira um rótulo em branco sendo preenchido; destino "Já fomos" / "Quero ir" escolhido em dois blocos grandes antes de salvar.
- **Folhas** (Radix Dialog como folha inferior): avaliação (4 critérios com estrelas de 36px, carimbo que acompanha a média, review, privada), visita, prato, nota do prato (estrelas, comentário, "pediria de novo?").
- **Mapa:** MapLibre com estilo claro tingido de papel; pins em camadas (GPU): "fomos" é um carimbo terracota com a nota, "quero ir" é um anel oliva vazado; clusters como carimbo com a contagem. Atribuição OpenFreeMap + OpenStreetMap sempre visível.
- **Movimento:** reordenação e filtro com animação de layout (Motion, mola `settle`); "Fomos!" carimba (escala + giro com a mola `pop`); o resto segue o padrão do mundo. Movimento reduzido: só dissolução.
