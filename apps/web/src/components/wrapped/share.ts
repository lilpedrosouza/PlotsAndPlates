"use client";

/** Story → PNG 1080×1920 gerado no aparelho. */
export async function renderStory(node: HTMLElement, fileName: string): Promise<File> {
  const { domToBlob } = await import("modern-screenshot");
  // A captura copia o layout da tela: por um instante o story fica em 9:16 (540×960) e volta.
  const previous = node.getAttribute("style");
  node.style.cssText += ";width:540px;height:960px;right:auto;bottom:auto;transform:none;";
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  try {
    const blob = await domToBlob(node, { width: 540, height: 960, scale: 2, type: "image/png" });
    return new File([blob], fileName, { type: "image/png" });
  } finally {
    if (previous === null) node.removeAttribute("style");
    else node.setAttribute("style", previous);
  }
}

export type DeliverResult = "shared" | "downloaded" | "cancelled" | "needs-tap";

/**
 * Compartilhamento do sistema; sem ele, baixa o arquivo. Gerar a imagem pode
 * demorar e o navegador (sobretudo no iPhone) só abre o compartilhamento logo
 * depois de um toque: aí devolve "needs-tap" e a tela pede um toque novo.
 */
export async function deliverStory(file: File): Promise<DeliverResult> {
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "PAP Wrapped" });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
      if (error instanceof DOMException && error.name === "NotAllowedError") return "needs-tap";
    }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "downloaded";
}
