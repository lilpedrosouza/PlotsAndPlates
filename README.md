# PlotsAndPlates (PAP)

O diário a dois do que a gente come e do que a gente assiste.

- **Plates**: restaurantes, visitas, pratos e avaliações.
- **Plots**: filmes, séries, documentários, animes e especiais.

Cada pessoa dá a própria nota; o app mostra as duas lado a lado e a média do casal. Uso pessoal, sem fins comerciais.

> **Estado atual: fase 1.** Monorepo, autenticação, perfil, design system dos dois mundos e a transição entre eles. Plates (fase 2) e Plots (fase 3) ainda não foram construídos; as partes deste README sobre Google Places e TMDB já descrevem como preparar as chaves, mas o código que as usa chega nessas fases.

## Como está organizado

```
apps/web         Next.js (App Router) + Tailwind + shadcn/ui — deploy na Vercel
apps/api         Hono (Node.js) — deploy na Railway; única porta para os dados e APIs externas
packages/shared  Schemas Zod, tipos e as regras de nota (com testes)
packages/db      Schema Drizzle, migrations e testes de RLS
```

- O site só fala com a **API**. As chaves secretas ficam todas em `apps/api`.
- A API valida o JWT do Supabase pelo **JWKS** e roda cada consulta com a identidade do usuário, então as **policies de RLS** valem como segunda camada de segurança.
- No navegador só existem a URL do Supabase e a chave **publicável** (pública por natureza), usadas para login e upload assinado.

## Rodar no seu computador

Pré-requisitos: **Node 22+** e **pnpm 12** (`npm install -g pnpm`).

```bash
pnpm install
```

### Modo local (sem criar conta em lugar nenhum)

```bash
pnpm dev:local
```

Sobe o site em <http://localhost:3000> e a API em <http://localhost:8787>, com um Postgres em memória e uma imitação mínima do Supabase (login por e-mail e senha + Storage). Os dados somem ao encerrar.

Contas de exemplo (senha `papdemo`): `ana@pap.local` e `bia@pap.local`. Também dá para criar uma conta nova pela tela de cadastro. O login com Google não existe neste modo.

Não precisa de nenhum `.env`: o comando já aponta o site para a API local.

O guia de estilo dos dois mundos fica em `/plates/estilo` e `/plots/estilo` (não precisa de login).

### Com um projeto Supabase de verdade

1. Crie as chaves (seção abaixo).
2. Copie `apps/api/.env.example` para `apps/api/.env` e `apps/web/.env.example` para `apps/web/.env.local`, e preencha.
3. Aplique as migrations e, se quiser, os dados de exemplo:

   ```bash
   DATABASE_URL="postgresql://..." pnpm db:migrate
   SEED_PASSWORD="uma-senha-de-8+" pnpm db:seed   # opcional; cria ana@pap.exemplo e bia@pap.exemplo
   ```

4. `pnpm dev`

### Comandos

| Comando | O que faz |
| --- | --- |
| `pnpm dev:local` | Site + API no modo local |
| `pnpm dev` | Site + API usando o `.env` de cada app |
| `pnpm test` | Testes: regras de nota, permissões (RLS) e API |
| `pnpm typecheck` / `pnpm lint` | Checagem de tipos e lint |
| `pnpm build` | Build de produção dos dois apps |
| `pnpm db:generate` | Gera uma migration a partir do schema Drizzle |
| `pnpm db:migrate` | Aplica as migrations no banco de `DATABASE_URL` |

## Criar as chaves

### Supabase (plano Free)

1. Em <https://supabase.com>, crie um projeto. Região sugerida: **South America (São Paulo)**. Guarde a senha do banco.
2. **Project Settings → Data API**: copie a **Project URL** → `SUPABASE_URL` (API) e `NEXT_PUBLIC_SUPABASE_URL` (site).
3. **Project Settings → API Keys**:
   - **Publishable key** (`sb_publishable_...`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (site).
   - **Secret key** (`sb_secret_...`) → `SUPABASE_SECRET_KEY` (**só na API**).
4. **Connect → Session pooler** (porta 5432): copie a connection string, troque `[YOUR-PASSWORD]` → `DATABASE_URL` (API). O *session pooler* funciona em IPv4 e serve também para o `pg_dump` do backup.
5. **Project Settings → JWT Keys**: o projeto precisa usar **chaves de assinatura assimétricas** (padrão nos projetos novos). É assim que a API valida os tokens pelo JWKS, sem guardar segredo de JWT. Se o projeto ainda estiver no segredo antigo (HS256), migre para as *signing keys* nessa tela.
6. **Authentication → URL Configuration**:
   - *Site URL*: o endereço do site na Vercel.
   - *Redirect URLs*: `https://SEU-SITE.vercel.app/auth/callback` e `http://localhost:3000/auth/callback`.
7. **Login com Google** (**Authentication → Sign In / Providers → Google**):
   - No Google Cloud (**APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth → Aplicativo da Web**), adicione em *URIs de redirecionamento autorizados*: `https://SEU-PROJETO.supabase.co/auth/v1/callback`.
   - Cole o *Client ID* e o *Client secret* no Supabase e ative o provedor.
8. Os buckets do Storage (`media`, público para leitura, e `backups`, privado) são criados sozinhos na primeira subida da API.

O Supabase Free pausa projetos sem atividade. A API faz um **ping diário** para evitar isso (veja "Tarefas agendadas").

### Google Cloud — Places API (New), com cotas diárias *(usado a partir da fase 2)*

O PAP usa o Google **só para localizar** o restaurante (autocomplete e busca); do Google só o `place_id` é guardado. Os dados salvos vêm do OpenStreetMap e do que vocês preenchem — é o que os termos do Google Maps Platform permitem.

1. Em <https://console.cloud.google.com>, crie um projeto e ative o faturamento (é exigido mesmo para ficar no gratuito).
2. **APIs e serviços → Biblioteca**: ative **Places API (New)**. Não ative a Places API antiga.
3. **APIs e serviços → Credenciais → Criar credenciais → Chave de API**. Em *Restrições de API*, restrinja a chave a **Places API (New)**. A chave vai só para a API do PAP (`GOOGLE_PLACES_API_KEY`), nunca para o site.
4. **Cotas diárias, para o uso nunca passar do gratuito.** Em **APIs e serviços → Places API (New) → Cotas e limites do sistema**, edite as cotas **por dia** de cada método que o PAP usa. Desde março de 2025 cada SKU tem uma franquia mensal gratuita própria (na tabela de preços: 10.000 chamadas/mês nos SKUs *Essentials*, 5.000 nos *Pro*, 1.000 nos *Enterprise*). Dividindo por 31 dias, com folga:

   | Método | Sugestão de cota por dia |
   | --- | --- |
   | Autocomplete (`AutocompletePlacesRequest`) | 300 |
   | Place Details (`GetPlaceRequest`) | 150 |
   | Text Search (`SearchTextRequest`) | 150 |

   Os nomes exatos das cotas podem variar no console; confira as franquias atuais em <https://mapsplatform.google.com/pricing/> antes de fixar os números. Com a cota diária atingida, o Google passa a recusar as chamadas — e o PAP cai no fallback (OpenStreetMap, depois cadastro manual).
5. **Faturamento → Orçamentos e alertas**: crie um orçamento de valor mínimo com alerta por e-mail, como rede de segurança.

### TMDB *(usado a partir da fase 3)*

1. Crie uma conta em <https://www.themoviedb.org> e peça uma chave em **Configurações → API** (uso pessoal).
2. Copie o **API Read Access Token** (v4) → `TMDB_ACCESS_TOKEN` na API.
3. O app precisa exibir a atribuição ao TMDB (logo + aviso "This product uses the TMDB API but is not endorsed or certified by TMDB") e à JustWatch onde aparecer "onde assistir".

## Deploy

A ordem que dá menos idas e vindas: Supabase → Railway (API) → Vercel (site) → voltar na Railway para liberar o endereço do site no CORS.

### API na Railway

1. Suba o repositório para o GitHub.
2. Na Railway: **New Project → Deploy from GitHub repo**. O `railway.json` da raiz já aponta para `apps/api/Dockerfile`, roda as migrations antes de cada deploy (`node dist/migrate.js`) e configura o healthcheck em `/health`.
3. Em **Variables**, defina:

   | Variável | Valor |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | connection string do *session pooler* |
   | `SUPABASE_URL` | Project URL |
   | `SUPABASE_SECRET_KEY` | secret key |
   | `WEB_ORIGINS` | endereço do site na Vercel (sem barra no fim) |
   | `CRON_ENABLED` | `true` |

4. **Settings → Networking → Generate Domain** para obter o endereço público da API.

A Railway não tem plano gratuito permanente: depois do crédito de teste, o plano Hobby custa cerca de US$ 5/mês.

### Site na Vercel (plano Hobby)

1. **Add New → Project**, importe o repositório.
2. **Root Directory**: `apps/web`. O restante (Next.js, pnpm) é detectado.
3. Em **Environment Variables**:

   | Variável | Valor |
   | --- | --- |
   | `NEXT_PUBLIC_API_URL` | endereço da API na Railway |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable key |

4. Depois do primeiro deploy, coloque o endereço final em `WEB_ORIGINS` (Railway) e nas *Redirect URLs* do Supabase.

## Tarefas agendadas (cron dentro da API)

Ligadas com `CRON_ENABLED=true`, no fuso de São Paulo:

| Tarefa | Quando | O que faz |
| --- | --- | --- |
| Ping | todo dia, 06:00 | Uma consulta no Postgres e uma chamada à API do Supabase, para o projeto Free não pausar |
| Backup | domingo, 03:30 | `pg_dump` dos schemas `public` e `auth` enviado ao bucket `backups`, mantendo os 4 mais recentes |

As fotos do Storage não entram no dump. A atualização do cache do TMDB entra na fase 3.

## Regras de nota

Ficam em `packages/shared/src/ratings.ts`, com testes ao lado:

- Notas de 0,5 a 5, em meia estrela.
- Nota geral do restaurante = média dos critérios (comida, atendimento, ambiente, custo-benefício) arredondada para a meia estrela mais próxima; empate arredonda para cima (4,25 → 4,5).
- Médias do casal e da comunidade são calculadas na hora, nunca armazenadas, e não são arredondadas para meia estrela (4 e 4,5 → 4,25).
- A nota da série é dada pelo usuário; a média das temporadas aparece só como sugestão.

Quem vê o quê (`packages/shared/src/visibility.ts`, espelhado nas policies de RLS): cada um edita só o que é seu; avaliação privada é vista pelo dono e pelo par; o resto dos usuários vê só o que é público.

## Design

Dois mundos com tokens separados em `apps/web/src/app/globals.css`:

- **Plates — rótulo**: papel creme impresso em terracota e oliva, Clarendon (Besley) nos títulos, foto em arco, nota como selo carimbado.
- **Plots — cartaz**: preto fosco com amarelo-legenda, Futura (Jost) em caixa alta, pôster de canto vivo, notas no bloco de créditos.

A troca de seção usa a View Transitions API: o cartaz é colado por cima do rótulo (e descola na volta) enquanto as letras P·L·T·S da marca viajam de "Plates" para "Plots". Tudo animado só com `transform` e `opacity`, com uma versão reduzida para `prefers-reduced-motion`.

O contexto de produto usado nas decisões de design está em `apps/web/PRODUCT.md`.
