import { thumbPathOf } from "@pap/shared";
import { badRequest } from "../errors";
import type { MediaStorage } from "../storage";

/** Pasta de cada tipo de foto de Plates no bucket `media`. */
export const PHOTO_FOLDERS = { restaurant: "restaurants", visit: "visits", dish: "dishes" } as const;

/** Só aceita fotos que o próprio usuário subiu (o upload assinado põe o id dele no caminho). */
export function assertOwnPhoto(path: string | null | undefined, kind: keyof typeof PHOTO_FOLDERS, userId: string) {
  if (path === null || path === undefined) return;
  if (!path.startsWith(`${PHOTO_FOLDERS[kind]}/${userId}/`)) {
    throw badRequest("Essa foto não foi enviada por você.", { path: "Foto inválida." });
  }
}

/** Uma foto a apagar e quem é dono da linha que a referencia. */
export type OwnedPhoto = { path: string | null | undefined; ownerId: string };

/** A foto está na pasta de quem é dono da linha? (`restaurants/<id do dono>/…`) */
export function belongsTo(path: string, ownerId: string): boolean {
  return path.split("/")[1] === ownerId;
}

/**
 * Apaga fotos e as miniaturas delas. Só apaga arquivos que estão na pasta do
 * dono da linha: um caminho alheio gravado direto no banco (pela API de dados
 * do Supabase) nunca leva a apagar a foto de outra pessoa. Falha no Storage
 * só vai para o log.
 */
export async function removePhotos(storage: MediaStorage, photos: ReadonlyArray<OwnedPhoto | null>) {
  const files = photos
    .filter((photo): photo is { path: string; ownerId: string } => Boolean(photo?.path) && belongsTo(photo!.path!, photo!.ownerId))
    .flatMap(({ path }) => [path, thumbPathOf(path)]);
  if (files.length === 0) return;
  try {
    await storage.remove(files);
  } catch (error) {
    console.error("Não foi possível apagar fotos do Storage:", error);
  }
}
