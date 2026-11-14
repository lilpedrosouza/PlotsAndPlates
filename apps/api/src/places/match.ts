/** Casamento de um lugar achado no Google com o mesmo lugar no OpenStreetMap. */

export type LatLng = { lat: number; lng: number };

export type OsmPlace = LatLng & {
  /** Ex.: `node/123`. */
  osmRef: string;
  name: string;
  tags: Record<string, string>;
};

/** Palavras que não ajudam a distinguir um lugar de outro. */
const GENERIC = new Set([
  "restaurante",
  "restaurant",
  "bar",
  "cafe",
  "cafeteria",
  "lanchonete",
  "o",
  "a",
  "os",
  "as",
  "do",
  "da",
  "dos",
  "das",
  "de",
  "e",
  "the",
]);

function tokens(value: string): string[] {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

function compact(value: string): string {
  const all = tokens(value);
  const meaningful = all.filter((token) => !GENERIC.has(token));
  return (meaningful.length > 0 ? meaningful : all).join("");
}

function bigrams(value: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (let index = 0; index < value.length - 1; index += 1) {
    const pair = value.slice(index, index + 2);
    counts.set(pair, (counts.get(pair) ?? 0) + 1);
  }
  return counts;
}

/** Semelhança de 0 a 1 entre dois nomes (coeficiente de Dice sobre bigramas). */
export function nameSimilarity(a: string, b: string): number {
  const left = compact(a);
  const right = compact(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.length < 2 || right.length < 2) return 0;

  const leftPairs = bigrams(left);
  const rightPairs = bigrams(right);
  let overlap = 0;
  for (const [pair, count] of leftPairs) {
    overlap += Math.min(count, rightPairs.get(pair) ?? 0);
  }
  return (2 * overlap) / (left.length - 1 + (right.length - 1));
}

/** Distância em metros entre dois pontos. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const radius = 6_371_000;
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
}

export const MIN_NAME_SIMILARITY = 0.55;

/** O candidato de nome parecido mais próximo; `null` se nenhum for parecido. */
export function pickMatch(name: string, candidates: readonly OsmPlace[], origin: LatLng): OsmPlace | null {
  let best: { place: OsmPlace; score: number; distance: number } | null = null;
  for (const place of candidates) {
    const score = nameSimilarity(name, place.name);
    if (score < MIN_NAME_SIMILARITY) continue;
    const distance = distanceMeters(origin, place);
    if (!best || score > best.score || (score === best.score && distance < best.distance)) {
      best = { place, score, distance };
    }
  }
  return best?.place ?? null;
}

/** O candidato mais próximo dentro do raio, para quando não há nome (link só com coordenadas). */
export function nearest(candidates: readonly OsmPlace[], origin: LatLng, maxMeters: number): OsmPlace | null {
  let best: { place: OsmPlace; distance: number } | null = null;
  for (const place of candidates) {
    const distance = distanceMeters(origin, place);
    if (distance <= maxMeters && (!best || distance < best.distance)) best = { place, distance };
  }
  return best?.place ?? null;
}
