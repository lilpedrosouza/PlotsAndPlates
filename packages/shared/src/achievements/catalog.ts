export const ACHIEVEMENT_KEYS = [
  "primeira-mesa",
  "volta-ao-mundo",
  "fregues",
  "explorador-de-bairros",
  "sobremesa-sempre",
  "caderno-cheio",
  "primeira-sessao",
  "cinefilo",
  "maratonista",
  "documentarista",
  "top-4",
  "critico-exigente",
  "almas-gemeas",
  "juntos-sempre",
  "opinioes-fortes",
  "primeiro-encontro",
] as const;
export type AchievementKey = (typeof ACHIEVEMENT_KEYS)[number];

export type AchievementWorld = "plates" | "plots" | "ambos" | "casal";

export type Achievement = {
  key: AchievementKey;
  world: AchievementWorld;
  name: string;
  description: string;
  /** Meta numérica: a conquista destrava quando a contagem chega nela. */
  target: number;
  /** Unidade do progresso ("7 de 10 cozinhas"). */
  unit: string;
};

export const ACHIEVEMENTS: readonly Achievement[] = [
  { key: "primeira-mesa", world: "plates", name: "Primeira mesa", description: "Registrar a primeira visita.", target: 1, unit: "visita" },
  { key: "volta-ao-mundo", world: "plates", name: "Volta ao mundo", description: "Visitar restaurantes de 10 cozinhas diferentes.", target: 10, unit: "cozinhas" },
  { key: "fregues", world: "plates", name: "Freguês", description: "Voltar 5 vezes ao mesmo restaurante.", target: 5, unit: "visitas no mesmo lugar" },
  { key: "explorador-de-bairros", world: "plates", name: "Explorador de bairros", description: "Visitar restaurantes em 5 bairros diferentes.", target: 5, unit: "bairros" },
  { key: "sobremesa-sempre", world: "plates", name: "Sobremesa sempre", description: "Avaliar 10 sobremesas.", target: 10, unit: "sobremesas" },
  { key: "caderno-cheio", world: "plates", name: "Caderno cheio", description: "Visitar 25 restaurantes.", target: 25, unit: "restaurantes" },
  { key: "primeira-sessao", world: "plots", name: "Primeira sessão", description: "Registrar a primeira sessão no diário.", target: 1, unit: "sessão" },
  { key: "cinefilo", world: "plots", name: "Cinéfilo", description: "Registrar 50 filmes.", target: 50, unit: "filmes" },
  { key: "maratonista", world: "plots", name: "Maratonista", description: "Registrar 3 temporadas da mesma série em até 7 dias.", target: 3, unit: "temporadas em 7 dias" },
  { key: "documentarista", world: "plots", name: "Documentarista", description: "Registrar 10 documentários.", target: 10, unit: "documentários" },
  { key: "top-4", world: "plots", name: "Top 4", description: "Completar o Top 4 do perfil.", target: 4, unit: "títulos no Top 4" },
  { key: "critico-exigente", world: "ambos", name: "Crítico exigente", description: "Dar 20 notas (restaurantes e títulos) com média até 3.", target: 20, unit: "notas" },
  { key: "almas-gemeas", world: "casal", name: "Almas gêmeas", description: "Dar 10 notas iguais às do par no mesmo restaurante, prato ou título.", target: 10, unit: "notas iguais" },
  { key: "juntos-sempre", world: "casal", name: "Juntos sempre", description: "Registrar 25 visitas ou sessões juntos.", target: 25, unit: "vezes juntos" },
  { key: "opinioes-fortes", world: "casal", name: "Opiniões fortes", description: "Discordar do par por 2 estrelas ou mais em 5 notas.", target: 5, unit: "discordâncias" },
  { key: "primeiro-encontro", world: "casal", name: "Primeiro encontro no PAP", description: "Virar par no PAP.", target: 1, unit: "vínculo" },
];

const BY_KEY = new Map(ACHIEVEMENTS.map((item) => [item.key, item]));

export function achievementByKey(key: AchievementKey): Achievement {
  const found = BY_KEY.get(key);
  if (!found) throw new Error(`Conquista desconhecida: ${key}`);
  return found;
}

export function isAchievementKey(value: string): value is AchievementKey {
  return BY_KEY.has(value as AchievementKey);
}
