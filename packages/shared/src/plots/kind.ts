/** Tipos de título do PAP e como sair do TMDB para eles. */

export const TITLE_KINDS = ["filme", "serie", "documentario", "anime", "especial"] as const;
export type TitleKind = (typeof TITLE_KINDS)[number];
export const TITLE_KIND_LABELS: Record<TitleKind, string> = {
  filme: "Filme",
  serie: "Série",
  documentario: "Documentário",
  anime: "Anime",
  especial: "Especial",
};

export type TmdbType = "movie" | "tv";

const DOCUMENTARY = 99;
const ANIMATION = 16;

/**
 * Tipo sugerido a partir do TMDB: documentário pelo gênero, anime quando é
 * animação japonesa, senão filme ou série. "Especial" é sempre escolha de quem usa.
 */
export function kindFromTmdb(input: { type: TmdbType; genreIds: readonly number[]; originalLanguage: string }): TitleKind {
  if (input.genreIds.includes(DOCUMENTARY)) return "documentario";
  if (input.genreIds.includes(ANIMATION) && input.originalLanguage === "ja") return "anime";
  return input.type === "movie" ? "filme" : "serie";
}

/** Já existe registro do mesmo filme (ou da mesma temporada)? */
export function isRewatch(previous: ReadonlyArray<{ seasonNumber: number | null }>, seasonNumber: number | null): boolean {
  return previous.some((log) => log.seasonNumber === seasonNumber);
}

export type TmdbImageSize = "w92" | "w185" | "w342" | "w500" | "w780" | "w1280";

/** Imagem direto do servidor do TMDB, no tamanho certo (sem passar pelo otimizador). */
export function tmdbImage(path: string | null | undefined, size: TmdbImageSize): string | null {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}
