/** Leitura de links do Google Maps colados pelo usuário. */

export class InvalidMapsUrl extends Error {
  constructor(message = "Esse link não parece ser de um lugar no Google Maps.") {
    super(message);
    this.name = "InvalidMapsUrl";
  }
}

export type ParsedMapsUrl = { name?: string; lat?: number; lng?: number; cid?: string };

const MAPS_HOSTS = new Set(["google.com", "www.google.com", "maps.google.com", "google.com.br", "www.google.com.br", "maps.google.com.br"]);
const SHORT_HOSTS = new Set(["maps.app.goo.gl", "goo.gl"]);
const MAX_REDIRECTS = 3;

const COORD = String.raw`-?\d{1,3}(?:\.\d+)?`;

function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, " ")).trim();
  } catch {
    return value.replace(/\+/g, " ").trim();
  }
}

function coordinates(lat: string, lng: string): { lat: number; lng: number } | null {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { lat: latitude, lng: longitude };
}

/** Extrai nome, coordenadas ou cid de um link do Google Maps. `null` se não for um. */
export function parseMapsUrl(raw: string): ParsedMapsUrl | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!MAPS_HOSTS.has(url.hostname)) return null;
  if (url.hostname !== "maps.google.com" && url.hostname !== "maps.google.com.br" && !url.pathname.startsWith("/maps")) {
    return null;
  }

  const result: ParsedMapsUrl = {};

  const place = /\/maps\/(?:place|search)\/([^/@]+)/.exec(url.pathname);
  if (place?.[1]) result.name = decodeSegment(place[1]);

  const exact = new RegExp(`!3d(${COORD})!4d(${COORD})`).exec(url.pathname);
  const at = new RegExp(`@(${COORD}),(${COORD})`).exec(url.pathname);
  const point = (exact && coordinates(exact[1]!, exact[2]!)) || (at && coordinates(at[1]!, at[2]!));
  if (point) Object.assign(result, point);

  const query = url.searchParams.get("q") ?? url.searchParams.get("query");
  if (query) {
    const pair = new RegExp(`^\\s*(${COORD})\\s*,\\s*(${COORD})\\s*$`).exec(query);
    const fromQuery = pair && coordinates(pair[1]!, pair[2]!);
    if (fromQuery) Object.assign(result, fromQuery);
    else if (!result.name) result.name = query.trim();
  }

  const cid = url.searchParams.get("cid");
  if (cid && /^\d+$/.test(cid)) result.cid = cid;

  return Object.keys(result).length > 0 ? result : null;
}

/** Segue links curtos (maps.app.goo.gl) até o Google Maps, sem sair dos hosts conhecidos. */
export async function expandMapsUrl(raw: string, fetcher: typeof fetch): Promise<string> {
  let current: URL;
  try {
    current = new URL(raw);
  } catch {
    throw new InvalidMapsUrl();
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (MAPS_HOSTS.has(current.hostname)) return current.href;
    if (!SHORT_HOSTS.has(current.hostname) || hop === MAX_REDIRECTS) throw new InvalidMapsUrl();

    const response = await fetcher(current.href, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(5000) });
    const location = response.headers.get("location");
    if (response.status < 300 || response.status >= 400 || !location) throw new InvalidMapsUrl();
    current = new URL(location, current);
  }
  throw new InvalidMapsUrl();
}
