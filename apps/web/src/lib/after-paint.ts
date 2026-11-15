/**
 * Roda `work` depois que o navegador pintar o próximo quadro. Um toque que
 * dispara trabalho pesado (mutação com atualização otimista, invalidações,
 * conquistas) mostra o retorno visual primeiro e só então faz o resto: a
 * latência do toque (INP) fica no que a pessoa vê, não no que vem depois.
 */
export function afterPaint(work: () => void): void {
  if (typeof requestAnimationFrame !== "function") {
    setTimeout(work, 0);
    return;
  }
  requestAnimationFrame(() => setTimeout(work, 0));
}
