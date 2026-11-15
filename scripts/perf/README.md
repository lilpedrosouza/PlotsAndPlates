# Roteiros de performance

Medem o PAP como o documento do projeto pede: Lighthouse mobile e interações
com a CPU 4x mais lenta (um Android intermediário). Usam o Chromium do
Playwright (`~/.cache/ms-playwright`) ou o que estiver em `CHROME_PATH`.

## Build de produção local

```bash
pnpm --filter @pap/api dev:local     # API local na 8787, dados de exemplo (zera ao reiniciar)
pnpm --filter web start:perf         # build de produção do site na 3100
```

No modo local os roteiros entram com `ana@pap.local` (e `bia@pap.local` para o
aviso de conquista). As interações gravam dados: reinicie a API antes de cada
rodada para partir dos mesmos dados.

## Lighthouse

```bash
pnpm perf:lighthouse --base http://localhost:3100 --label local-depois
pnpm perf:lighthouse --base http://localhost:3100 --label teste --only plates-caderno --runs 1
```

Mede 14 telas (mediana de 3 rodadas, cache limpo em cada uma). `/entrar` e `/`
são medidas num navegador sem sessão. Antes de medir, as conquistas já
desbloqueadas são marcadas como vistas, para o aviso não virar o "maior
elemento" da tela. Resumo em `docs/performance/data/<label>.json`; relatórios
brutos (HTML e JSON da rodada mediana) em `.perf/<label>/`.

## Interações

```bash
pnpm perf:interactions --base http://localhost:3100 --label local-depois
```

Para cada interação: a maior latência de evento (Event Timing, a base do INP)
e os intervalos entre quadros durante a animação (mediana, p95, máximo e
quantos passaram de 50 ms). Linhas marcadas com `<<<` estão fora da meta
(INP < 200 ms, mediana ≤ 16,7 ms, nenhum quadro > 50 ms).

## Produção

Use as contas de teste (nunca as reais). Credenciais só por variável de ambiente:

```bash
PERF_EMAIL=… PERF_PASSWORD=… pnpm perf:lighthouse --base https://plots-and-plates.vercel.app --label prod-depois
```

As interações gravam dados; em produção, rode só com as contas de teste.
