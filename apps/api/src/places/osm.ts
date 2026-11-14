import type { PlaceSuggestion, RestaurantInput } from "@pap/shared";
import { createTtlCache } from "./cache";
import type { LatLng, OsmPlace } from "./match";

/**
 * OpenStreetMap: Nominatim (busca por nome e endereço reverso) e Overpass
 * (lugares de comer perto de um ponto). Os dados salvos no PAP vêm daqui.
 *
 * Política do Nominatim: no máximo 1 requisição por segundo e um User-Agent que
 * identifique o app. Nenhum dado pessoal vai nas requisições.
 */

export type Osm = {
  search: (q: string, near?: LatLng) => Promise<PlaceSuggestion[]>;
  nearby: (point: LatLng, radiusMeters: number) => Promise<OsmPlace[]>;
  lookup: (osmRef: string) => Promise<OsmPlace | null>;
  reverse: (point: LatLng) => Promise<OsmAddress | null>;
};

export type OsmAddress = LatLng & { road: string; houseNumber: string; neighborhood: string; city: string };

const NOMINATIM = "https://nominatim.openstreetmap.org";
const OVERPASS = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "PlotsAndPlates/1.0";
const NOMINATIM_INTERVAL_MS = 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Valores de `amenity` que contam como lugar de comer ou beber. */
export const FOOD_AMENITIES = ["restaurant", "cafe", "bar", "fast_food", "pub", "ice_cream", "food_court", "biergarten"];
const FOOD_SET = new Set(FOOD_AMENITIES);

type NominatimAddress = {
  road?: string;
  pedestrian?: string;
  house_number?: string;
  suburb?: string;
  neighbourhood?: string;
  quarter?: string;
  city_district?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
};

type NominatimPlace = {
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  category?: string;
  class?: string;
  type: string;
  name?: string;
  display_name: string;
  address?: NominatimAddress;
};

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

const neighborhoodOf = (address: NominatimAddress) =>
  address.suburb ?? address.neighbourhood ?? address.quarter ?? address.city_district ?? "";
const cityOf = (address: NominatimAddress) =>
  address.city ?? address.town ?? address.village ?? address.municipality ?? "";

function toOsmPlace(element: OverpassElement): OsmPlace | null {
  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;
  const name = element.tags?.name;
  if (lat === undefined || lng === undefined || !name) return null;
  return { osmRef: `${element.type}/${element.id}`, name, lat, lng, tags: element.tags ?? {} };
}

export function createOsm(
  options: { fetch?: typeof fetch; now?: () => number; sleep?: (ms: number) => Promise<void>; timeoutMs?: number } = {},
): Osm {
  const fetcher = options.fetch ?? fetch;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const timeoutMs = options.timeoutMs ?? 8000;
  const cache = createTtlCache<unknown>({ ttlMs: DAY_MS, max: 500, now });

  // Fila do Nominatim: uma requisição por vez, com 1 s entre elas.
  let queue: Promise<unknown> = Promise.resolve();
  let lastNominatimAt = Number.NEGATIVE_INFINITY;

  async function getJson<T>(url: string, init: RequestInit = {}): Promise<T> {
    const response = await fetcher(url, {
      ...init,
      headers: { "user-agent": USER_AGENT, accept: "application/json", ...init.headers },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`OpenStreetMap respondeu ${response.status}.`);
    return (await response.json()) as T;
  }

  async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = cache.get(key);
    if (hit !== undefined) return hit as T;
    const value = await load();
    cache.set(key, value);
    return value;
  }

  function nominatim<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = `${NOMINATIM}${path}?${new URLSearchParams({ format: "jsonv2", "accept-language": "pt-BR", ...params })}`;
    return cached(url, () => {
      const run = queue.then(async () => {
        const wait = lastNominatimAt + NOMINATIM_INTERVAL_MS - now();
        if (wait > 0) await sleep(wait);
        lastNominatimAt = now();
        return getJson<T>(url);
      });
      queue = run.catch(() => undefined);
      return run;
    });
  }

  function overpass(query: string): Promise<OsmPlace[]> {
    return cached(`overpass:${query}`, async () => {
      const data = await getJson<{ elements?: OverpassElement[] }>(OVERPASS, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: query }).toString(),
      });
      return (data.elements ?? []).map(toOsmPlace).filter((place) => place !== null);
    });
  }

  return {
    search: async (q, near) => {
      const params: Record<string, string> = { q, countrycodes: "br", addressdetails: "1", limit: "10" };
      if (near) {
        const d = 0.3;
        params.viewbox = `${near.lng - d},${near.lat + d},${near.lng + d},${near.lat - d}`;
      }
      const places = await nominatim<NominatimPlace[]>("/search", params);
      return places
        .filter((place) => (place.category ?? place.class) === "amenity" && FOOD_SET.has(place.type))
        .map((place) => {
          const address = place.address ?? {};
          const name = place.name || place.display_name.split(",")[0] || "";
          const street = [address.road ?? address.pedestrian, address.house_number].filter(Boolean).join(", ");
          const secondary = [street, neighborhoodOf(address), cityOf(address)].filter(Boolean).join(" · ");
          const osmRef = `${place.osm_type}/${place.osm_id}`;
          return { id: `osm:${osmRef}`, source: "osm" as const, primary: name, secondary, osmRef };
        });
    },

    nearby: (point, radiusMeters) => {
      const r = Math.round(radiusMeters);
      const lat = point.lat.toFixed(6);
      const lng = point.lng.toFixed(6);
      return overpass(
        `[out:json][timeout:10];nwr[amenity~"^(${FOOD_AMENITIES.join("|")})$"][name](around:${r},${lat},${lng});out center tags 30;`,
      );
    },

    lookup: async (osmRef) => {
      const [type, id] = osmRef.split("/");
      if (!type || !id || !/^(node|way|relation)$/.test(type) || !/^\d+$/.test(id)) return null;
      const places = await overpass(`[out:json][timeout:10];${type}(${id});out center tags;`);
      return places[0] ?? null;
    },

    reverse: async (point) => {
      const data = await nominatim<{ lat?: string; lon?: string; address?: NominatimAddress; error?: string }>(
        "/reverse",
        { lat: String(point.lat), lon: String(point.lng), zoom: "18", addressdetails: "1" },
      );
      if (data.error || !data.address) return null;
      return {
        lat: data.lat ? Number(data.lat) : point.lat,
        lng: data.lon ? Number(data.lon) : point.lng,
        road: data.address.road ?? data.address.pedestrian ?? "",
        houseNumber: data.address.house_number ?? "",
        neighborhood: neighborhoodOf(data.address),
        city: cityOf(data.address),
      };
    },
  };
}

function normalizeWebsite(value: string | undefined): string {
  if (!value) return "";
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(candidate).href;
  } catch {
    return "";
  }
}

/** Campos do formulário a partir das tags de um lugar do OpenStreetMap. */
export function osmToFields(place: OsmPlace): RestaurantInput {
  const tags = place.tags;
  const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(", ");
  return {
    name: place.name.slice(0, 80),
    osmRef: place.osmRef,
    lat: place.lat,
    lng: place.lng,
    address: street.slice(0, 160),
    neighborhood: (tags["addr:suburb"] ?? tags["addr:neighbourhood"] ?? "").slice(0, 60),
    city: (tags["addr:city"] ?? "").slice(0, 60),
    phone: (tags.phone ?? tags["contact:phone"] ?? "").split(";")[0]?.trim().slice(0, 30) ?? "",
    website: normalizeWebsite(tags.website ?? tags["contact:website"]),
    openingHours: (tags.opening_hours ?? "").slice(0, 300),
    cuisines: (tags.cuisine ?? "")
      .split(";")
      .map((cuisine) => cuisine.trim())
      .filter(Boolean)
      .slice(0, 5),
  };
}
