import type { PlaceSuggestion, RestaurantInput } from "@pap/shared";
import { createTtlCache } from "./cache";
import { type LatLng, type OsmPlace, distanceMeters } from "./match";

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
  /** Lugares de comer com esse nome perto do ponto, pelo Nominatim (plano B quando o Overpass não responde). */
  searchNear: (name: string, point: LatLng, radiusMeters: number) => Promise<OsmPlace[]>;
  lookup: (osmRef: string) => Promise<OsmPlace | null>;
  reverse: (point: LatLng) => Promise<OsmAddress | null>;
};

export type OsmAddress = LatLng & { road: string; houseNumber: string; neighborhood: string; city: string };

const NOMINATIM = "https://nominatim.openstreetmap.org";
/** Servidor principal do Overpass e espelhos públicos, tentados em ordem quando um está lotado. */
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
const USER_AGENT = "PlotsAndPlates/1.0";
const NOMINATIM_INTERVAL_MS = 1000;
/** Depois de uma falha geral do Overpass, tanto tempo sem tentar de novo. */
const OVERPASS_COOLDOWN_MS = 60_000;
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
  extratags?: Record<string, string>;
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
  options: {
    fetch?: typeof fetch;
    now?: () => number;
    sleep?: (ms: number) => Promise<void>;
    timeoutMs?: number;
    /** Sem resposta do servidor do Overpass em tanto tempo, o seguinte entra em paralelo. */
    overpassHedgeMs?: number;
    /** Prazo total do Overpass: depois disso desiste (quem chama cai no plano B). */
    overpassBudgetMs?: number;
  } = {},
): Osm {
  const fetcher = options.fetch ?? fetch;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const timeoutMs = options.timeoutMs ?? 8000;
  const overpassHedgeMs = options.overpassHedgeMs ?? 1200;
  const overpassBudgetMs = options.overpassBudgetMs ?? 3500;
  const cache = createTtlCache<unknown>({ ttlMs: DAY_MS, max: 500, now });

  // Fila do Nominatim: uma requisição por vez, com 1 s entre elas.
  let queue: Promise<unknown> = Promise.resolve();
  let lastNominatimAt = Number.NEGATIVE_INFINITY;

  async function getJson<T>(url: string, init: RequestInit = {}): Promise<T> {
    const response = await fetcher(url, {
      ...init,
      headers: { "user-agent": USER_AGENT, accept: "application/json", ...init.headers },
      signal: init.signal ? AbortSignal.any([AbortSignal.timeout(timeoutMs), init.signal]) : AbortSignal.timeout(timeoutMs),
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

  /**
   * Overpass com espera escalonada: começa no servidor principal; sem resposta em
   * `overpassHedgeMs` (ou se ele falhar), o espelho seguinte entra em paralelo, e
   * vale o primeiro que responder. Passado `overpassBudgetMs`, desiste e cancela
   * tudo. Antes eram 8 s por servidor, um depois do outro: até 24 s com os três lotados.
   */
  // Depois de uma falha geral, o Overpass fica de lado por um minuto: quem escolher
  // outro lugar nesse meio-tempo vai direto ao plano B, sem esperar o prazo de novo.
  let overpassDownUntil = Number.NEGATIVE_INFINITY;

  function overpass(query: string): Promise<OsmPlace[]> {
    if (now() < overpassDownUntil) return Promise.reject(new Error("O Overpass está fora do ar agora."));
    return cached(`overpass:${query}`, () =>
      raceOverpass(query).catch((error: unknown) => {
        overpassDownUntil = now() + OVERPASS_COOLDOWN_MS;
        throw error;
      }),
    );
  }

  function raceOverpass(query: string): Promise<OsmPlace[]> {
    const controller = new AbortController();
    return new Promise<OsmPlace[]>((resolve, reject) => {
      const timers: ReturnType<typeof setTimeout>[] = [];
      let started = 0;
      let pending = 0;
      let settled = false;
      let lastError: unknown = new Error("O Overpass não respondeu a tempo.");
      const finish = (done: () => void) => {
        if (settled) return;
        settled = true;
        for (const timer of timers) clearTimeout(timer);
        controller.abort();
        done();
      };
      const startNext = () => {
        if (settled || started >= OVERPASS_ENDPOINTS.length) return;
        const endpoint = OVERPASS_ENDPOINTS[started++]!;
        pending++;
        if (started < OVERPASS_ENDPOINTS.length) timers.push(setTimeout(startNext, overpassHedgeMs));
        getJson<{ elements?: OverpassElement[] }>(endpoint, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ data: query }).toString(),
          signal: controller.signal,
        }).then(
          (data) => finish(() => resolve((data.elements ?? []).map(toOsmPlace).filter((place) => place !== null))),
          (error: unknown) => {
            pending--;
            if (settled) return;
            lastError = error;
            if (started < OVERPASS_ENDPOINTS.length) startNext();
            else if (pending === 0) finish(() => reject(lastError));
          },
        );
      };
      timers.push(setTimeout(() => finish(() => reject(lastError)), overpassBudgetMs));
      startNext();
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

    searchNear: async (name, point, radiusMeters) => {
      // Caixa pequena ao redor do ponto (~1 km), só dentro dela.
      const d = 0.01;
      const places = await nominatim<NominatimPlace[]>("/search", {
        q: name,
        countrycodes: "br",
        limit: "10",
        bounded: "1",
        viewbox: `${point.lng - d},${point.lat + d},${point.lng + d},${point.lat - d}`,
      });
      return places
        .filter((place) => (place.category ?? place.class) === "amenity" && FOOD_SET.has(place.type))
        .map((place) => ({
          osmRef: `${place.osm_type}/${place.osm_id}`,
          name: place.name || place.display_name.split(",")[0] || "",
          lat: Number(place.lat),
          lng: Number(place.lon),
          tags: {},
        }))
        .filter((place) => distanceMeters(point, place) <= radiusMeters);
    },

    lookup: async (osmRef) => {
      const [type, id] = osmRef.split("/");
      if (!type || !id || !/^(node|way|relation)$/.test(type) || !/^\d+$/.test(id)) return null;
      const places = await nominatim<NominatimPlace[]>("/lookup", {
        osm_ids: `${type[0]!.toUpperCase()}${id}`,
        addressdetails: "1",
        extratags: "1",
      });
      const place = places[0];
      if (!place) return null;
      const address = place.address ?? {};
      const tags: Record<string, string> = { ...place.extratags };
      const street = address.road ?? address.pedestrian;
      if (street) tags["addr:street"] = street;
      if (address.house_number) tags["addr:housenumber"] = address.house_number;
      if (neighborhoodOf(address)) tags["addr:suburb"] = neighborhoodOf(address);
      if (cityOf(address)) tags["addr:city"] = cityOf(address);
      return {
        osmRef,
        name: place.name || place.display_name.split(",")[0] || "",
        lat: Number(place.lat),
        lng: Number(place.lon),
        tags,
      };
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
