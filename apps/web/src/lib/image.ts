/**
 * Compressão de imagem no navegador antes do upload: redimensiona para caber
 * em `maxSize` px no maior lado e converte para WebP. Tudo fora da thread de
 * layout quando o navegador permite (createImageBitmap + OffscreenCanvas).
 */
export type CompressOptions = {
  /** Maior lado, em pixels. */
  maxSize: number;
  /** Qualidade do WebP, de 0 a 1. */
  quality?: number;
  /** Recorta para esta proporção (largura / altura), centralizado. */
  aspect?: number;
};

export const IMAGE_PRESETS = {
  /** Fotos de restaurante, prato e visita. */
  photo: { maxSize: 1600, quality: 0.82 },
  /** Miniatura para listas e grades. */
  thumb: { maxSize: 400, quality: 0.74 },
  avatar: { maxSize: 512, quality: 0.84, aspect: 1 },
  banner: { maxSize: 1600, quality: 0.8, aspect: 16 / 6 },
} satisfies Record<string, CompressOptions>;

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
export const IMAGE_ACCEPT = ACCEPTED.join(",");

export async function compressImage(file: Blob, options: CompressOptions): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => {
    throw new Error("Não conseguimos ler essa imagem. Tenta outra (JPG, PNG ou WebP).");
  });

  try {
    // Recorte central na proporção pedida.
    let sourceWidth = bitmap.width;
    let sourceHeight = bitmap.height;
    if (options.aspect) {
      if (sourceWidth / sourceHeight > options.aspect) sourceWidth = Math.round(sourceHeight * options.aspect);
      else sourceHeight = Math.round(sourceWidth / options.aspect);
    }
    const sourceX = Math.round((bitmap.width - sourceWidth) / 2);
    const sourceY = Math.round((bitmap.height - sourceHeight) / 2);

    const scale = Math.min(1, options.maxSize / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const quality = options.quality ?? 0.82;

    if (typeof OffscreenCanvas !== "undefined") {
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Seu navegador não conseguiu preparar a imagem.");
      context.imageSmoothingQuality = "high";
      context.drawImage(bitmap, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
      return await canvas.convertToBlob({ type: "image/webp", quality });
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Seu navegador não conseguiu preparar a imagem.");
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Não deu para converter a imagem."))),
        "image/webp",
        quality,
      );
    });
  } finally {
    bitmap.close();
  }
}

/** Foto em tamanho cheio + miniatura, prontas para subir. */
export async function compressWithThumb(file: Blob): Promise<{ full: Blob; thumb: Blob }> {
  const [full, thumb] = await Promise.all([
    compressImage(file, IMAGE_PRESETS.photo),
    compressImage(file, IMAGE_PRESETS.thumb),
  ]);
  return { full, thumb };
}

/**
 * Imagens que o otimizador do Next não deve (ou não consegue) buscar: prévias
 * locais (blob:) e arquivos servidos por localhost no modo local.
 */
export function skipsOptimizer(src: string): boolean {
  return src.startsWith("blob:") || src.startsWith("data:") || /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(src);
}
