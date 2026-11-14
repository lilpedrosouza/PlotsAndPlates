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

/** Apaga fotos e as miniaturas delas. Falha no Storage só vai para o log. */
export async function removePhotos(storage: MediaStorage, paths: ReadonlyArray<string | null | undefined>) {
  const files = paths.filter((path): path is string => Boolean(path)).flatMap((path) => [path, thumbPathOf(path)]);
  if (files.length === 0) return;
  try {
    await storage.remove(files);
  } catch (error) {
    console.error("Não foi possível apagar fotos do Storage:", error);
  }
}
