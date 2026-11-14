import type { PhotoUploadKind, SignedUpload } from "@pap/shared";
import { api } from "../api";
import { compressWithThumb } from "../image";
import { getSupabase } from "../supabase";

/**
 * Comprime no navegador (WebP até 1600 px + miniatura), sobe os dois arquivos
 * por upload assinado e devolve o caminho da foto.
 */
export async function uploadPlatesPhoto(kind: PhotoUploadKind, file: Blob): Promise<string> {
  const { full, thumb } = await compressWithThumb(file);
  const signed = await api<SignedUpload>("/uploads/sign", { method: "POST", body: { kind } });
  const storage = getSupabase().storage.from(signed.bucket);
  const uploads = [storage.uploadToSignedUrl(signed.path, signed.token, full, { contentType: "image/webp" })];
  if (signed.thumbPath && signed.thumbToken) {
    uploads.push(storage.uploadToSignedUrl(signed.thumbPath, signed.thumbToken, thumb, { contentType: "image/webp" }));
  }
  const results = await Promise.all(uploads);
  if (results.some((result) => result.error)) throw new Error("A foto não subiu. Tenta de novo?");
  return signed.path;
}
