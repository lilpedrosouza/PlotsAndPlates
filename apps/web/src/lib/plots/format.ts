import { TITLE_KIND_LABELS, type TitleSummary } from "@pap/shared";

/** "1h 44min", "48min por episódio". */
export function runtimeLabel(minutes: number | null | undefined, perEpisode = false): string {
  if (!minutes) return "";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const text = hours > 0 ? `${hours}h${rest ? ` ${rest}min` : ""}` : `${rest}min`;
  return perEpisode ? `${text} por episódio` : text;
}

const MONTH = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
const DAY = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });

/** "novembro de 2026" a partir de "2026-11-05". */
export const monthLabel = (iso: string) => MONTH.format(new Date(`${iso.slice(0, 7)}-15T12:00:00Z`));
/** Chave do mês ("2026-11") para agrupar o diário. */
export const monthKey = (iso: string) => iso.slice(0, 7);
/** "05 nov". */
export const dayLabel = (iso: string) => DAY.format(new Date(`${iso}T12:00:00Z`)).replace(".", "");

/** Linha de créditos do cartaz: ano · duração ou temporadas · tipo. */
export function creditLine(title: Pick<TitleSummary, "year" | "runtime" | "seasonCount" | "tmdbType" | "kind">): string {
  const length =
    title.tmdbType === "tv"
      ? title.seasonCount
        ? `${title.seasonCount} ${title.seasonCount === 1 ? "temporada" : "temporadas"}`
        : ""
      : runtimeLabel(title.runtime);
  return [title.year ? String(title.year) : "", length, TITLE_KIND_LABELS[title.kind]].filter(Boolean).join(" · ");
}

/** "T2" para a temporada 2; vazio em filme. */
export const seasonTag = (seasonNumber: number | null) => (seasonNumber === null ? "" : `T${seasonNumber}`);
