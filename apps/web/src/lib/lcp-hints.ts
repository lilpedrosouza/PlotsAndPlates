/**
 * Dica das primeiras imagens de cada tela, guardada na última visita. Um script
 * mínimo no <head> (LCP_HINT_SCRIPT, no layout raiz) lê a dica da tela que está
 * abrindo e já pede essas imagens, antes do JavaScript do app: o pôster que é o
 * maior elemento do quero ver deixa de esperar o app carregar para começar a baixar.
 */
export const LCP_HINTS_KEY = "pap-lcp";
const MAX_SCREENS = 12;

export function rememberLcpImages(pathname: string, urls: string[]): void {
  try {
    const hints = JSON.parse(localStorage.getItem(LCP_HINTS_KEY) ?? "{}") as Record<string, string[]>;
    const next = urls.filter(Boolean).slice(0, 3);
    if (JSON.stringify(hints[pathname] ?? []) === JSON.stringify(next)) return;
    delete hints[pathname];
    if (next.length) hints[pathname] = next;
    const entries = Object.entries(hints).slice(-MAX_SCREENS);
    localStorage.setItem(LCP_HINTS_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Sem armazenamento local, a tela só não ganha a dica.
  }
}

export function clearLcpHints(): void {
  try {
    localStorage.removeItem(LCP_HINTS_KEY);
  } catch {
    // Nada guardado.
  }
}

/** Roda no <head>, antes de tudo: pede as imagens da dica desta tela. Só imagens do TMDB. */
export const LCP_HINT_SCRIPT = `(function(){try{var h=JSON.parse(localStorage.getItem("${LCP_HINTS_KEY}")||"{}")[location.pathname];if(!h)return;for(var i=0;i<h.length;i++){if(h[i].indexOf("https://image.tmdb.org/")!==0)continue;var l=document.createElement("link");l.rel="preload";l.as="image";l.href=h[i];l.setAttribute("fetchpriority",i===0?"high":"low");document.head.appendChild(l);}}catch(e){}})();`;
