import { badRequest } from "../errors";

/**
 * Cursor da paginação do caderno. É só um deslocamento opaco para o cliente:
 * os cadernos têm dezenas de itens, então não compensa paginar por chave.
 */
export function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ o: offset })).toString("base64url");
}

export function decodeCursor(cursor: string | undefined): number {
  if (!cursor) return 0;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as { o?: unknown };
    if (typeof parsed.o === "number" && Number.isInteger(parsed.o) && parsed.o >= 0) return parsed.o;
  } catch {
    // cai no erro abaixo
  }
  throw badRequest("Página inválida.");
}
