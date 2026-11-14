# Imagem da API do PAP para a Railway.
# O contexto do build é a RAIZ do monorepo: docker build -f apps/api/Dockerfile .

FROM node:22-trixie-slim AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN npm install --global pnpm@12.18.0
WORKDIR /repo

# Manifestos primeiro, para o cache de dependências sobreviver a mudanças de código.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile --filter @pap/api...

COPY apps/api apps/api
COPY packages packages
RUN pnpm --filter @pap/api build
# Pasta enxuta: dist + só as dependências de produção.
RUN pnpm --filter @pap/api deploy --prod --legacy /out


FROM node:22-trixie-slim AS runtime
# pg_dump 17 para o backup semanal (precisa ser >= a versão do Postgres do Supabase).
RUN apt-get update \
  && apt-get install --yes --no-install-recommends postgresql-client-17 ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/dist ./dist
COPY --from=build /out/package.json ./package.json

USER node
EXPOSE 8787
CMD ["node", "dist/index.js"]
