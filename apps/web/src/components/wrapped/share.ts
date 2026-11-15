"use client";

/** Story → PNG 1080×1920 gerado no aparelho; compartilha pelo sistema ou baixa. */
export async function shareStory(node: HTMLElement, fileName: string): Promise<"shared" | "downloaded" | "cancelled"> {
  const { domToBlob } = await import("modern-screenshot");
  // A captura copia o layout da tela: por um instante o story fica em 9:16 (540×960) e volta.
  const previous = node.getAttribute("style");
  node.style.cssText += ";width:540px;height:960px;right:auto;bottom:auto;transform:none;";
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  let blob: Blob;
  try {
    blob = await domToBlob(node, { width: 540, height: 960, scale: 2, type: "image/png" });
  } finally {
    if (previous === null) node.removeAttribute("style");
    else node.setAttribute("style", previous);
  }
  const file = new File([blob], fileName, { type: "image/png" });
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "PAP Wrapped" });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "downloaded";
}
