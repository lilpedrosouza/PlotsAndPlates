export const SECTIONS = ["plates", "plots"] as const;
export type Section = (typeof SECTIONS)[number];

export const SECTION_LABEL: Record<Section, string> = {
  plates: "Plates",
  plots: "Plots",
};

/** Tipo da View Transition ao trocar de mundo. */
export const WORLD_TRANSITION: Record<Section, string> = {
  plates: "to-plates",
  plots: "to-plots",
};

const LAST_SECTION_KEY = "pap-secao";

export function otherSection(section: Section): Section {
  return section === "plates" ? "plots" : "plates";
}

/** Páginas que existem nos dois mundos: ao trocar, a pessoa continua na mesma. */
const MIRRORED = ["/perfil", "/estilo", "/pessoas"];
/** O perfil público de alguém também existe nos dois mundos. */
const PUBLIC_PROFILE = /^\/u\/[^/]+$/;
/** O Wrapped de um ano também. */
const WRAPPED = /^\/wrapped\/\d{4}$/;

export function mirrorPath(pathname: string, target: Section): string {
  const rest = pathname.replace(/^\/(plates|plots)/, "");
  return MIRRORED.includes(rest) || PUBLIC_PROFILE.test(rest) || WRAPPED.test(rest) ? `/${target}${rest}` : `/${target}`;
}

export function rememberSection(section: Section) {
  try {
    localStorage.setItem(LAST_SECTION_KEY, section);
  } catch {
    // Sem armazenamento local, a preferência só não é lembrada.
  }
}

export function lastSection(): Section {
  try {
    return localStorage.getItem(LAST_SECTION_KEY) === "plots" ? "plots" : "plates";
  } catch {
    return "plates";
  }
}
