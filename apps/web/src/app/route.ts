/**
 * Raiz: decide o destino antes de baixar o app. Um HTML mínimo, sem React,
 * lê a sessão do Supabase e o último mundo no localStorage e troca de URL.
 * Sem storage (ou sem JS) não há sessão legível: vai para a porta de entrada.
 */
const HTML = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#f3e9d6">
<title>PlotsAndPlates</title>
<noscript><meta http-equiv="refresh" content="0; url=/entrar"></noscript>
<script>
(function () {
  var target = "/entrar";
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && /^sb-.+-auth-token$/.test(key) && localStorage.getItem(key)) {
        target = localStorage.getItem("pap-secao") === "plots" ? "/plots" : "/plates";
        break;
      }
    }
  } catch (error) {}
  location.replace(target);
})();
</script>
<style>html{background:#f3e9d6}</style>
</head>
<body></body>
</html>`;

export function GET() {
  return new Response(HTML, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=0, must-revalidate" },
  });
}
