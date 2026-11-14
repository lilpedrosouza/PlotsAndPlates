import type { AutocompleteResponse, LivePlace, PlaceResolveInput, RestaurantDraft, RestaurantInput } from "@pap/shared";
import { createTtlCache } from "./cache";
import { type GooglePlaces, PlacesUnavailable } from "./google";
import { InvalidMapsUrl, expandMapsUrl, parseMapsUrl } from "./maps-url";
import { type LatLng, type OsmPlace, nearest, pickMatch } from "./match";
import { type Osm, type OsmAddress, osmToFields } from "./osm";

/**
 * Busca e rascunho de restaurantes (caminho 1): o Google só localiza; os
 * dados do rascunho vêm do OpenStreetMap e do que o usuário digitou.
 */

export type PlacesService = {
  autocomplete: (input: { q: string; session: string; near?: LatLng }) => Promise<AutocompleteResponse>;
  resolve: (input: PlaceResolveInput) => Promise<RestaurantDraft>;
  live: (googlePlaceId: string) => Promise<LivePlace>;
};

export type FindExisting = (by: { googlePlaceId?: string; osmRef?: string }) => Promise<string | null>;

/** Raio da busca do mesmo lugar no OSM ao redor do ponto do Google. */
const MATCH_RADIUS_M = 80;
/** Sem nome (link só com coordenadas): aceita o lugar mais próximo até aqui. */
const COORDS_ONLY_RADIUS_M = 25;
const DAY_MS = 24 * 60 * 60 * 1000;

const swallow = async <T>(promise: Promise<T>, fallback: T): Promise<T> => {
  try {
    return await promise;
  } catch {
    return fallback;
  }
};

export function createPlacesService(deps: {
  google: GooglePlaces | null;
  osm: Osm;
  findExisting: FindExisting;
  fetch?: typeof fetch;
}): PlacesService {
  const fetcher = deps.fetch ?? fetch;
  const linkToPlaceId = createTtlCache<string | null>({ ttlMs: DAY_MS, max: 500 });

  const existing = (id: string): RestaurantDraft => ({
    existingId: id,
    source: "manual",
    fields: { name: "" },
    osmAttribution: false,
  });

  /** Completa bairro e cidade pelo endereço reverso quando o OSM não trouxe. */
  async function withArea(fields: RestaurantInput, point: LatLng): Promise<{ fields: RestaurantInput; used: boolean }> {
    if (fields.neighborhood && fields.city) return { fields, used: false };
    const area = await swallow(deps.osm.reverse(point), null);
    if (!area) return { fields, used: false };
    return {
      fields: { ...fields, neighborhood: fields.neighborhood || area.neighborhood, city: fields.city || area.city },
      used: true,
    };
  }

  async function fromOsmPlace(place: OsmPlace, extra: Partial<RestaurantInput>, source: RestaurantDraft["source"]) {
    const found = await deps.findExisting({ osmRef: place.osmRef });
    if (found) return existing(found);
    const { fields } = await withArea({ ...osmToFields(place), ...extra }, place);
    return { source, fields, osmAttribution: true } satisfies RestaurantDraft;
  }

  /**
   * Rascunho para o usuário completar. O ponto vem do endereço reverso do OSM
   * (o mais próximo do lugar), para não guardar coordenadas do Google.
   */
  async function manualDraft(name: string, point: LatLng | null, extra: Partial<RestaurantInput>): Promise<RestaurantDraft> {
    const address: OsmAddress | null = point ? await swallow(deps.osm.reverse(point), null) : null;
    const fields: RestaurantInput = { name: name.slice(0, 80), ...extra };
    if (address) {
      Object.assign(fields, {
        lat: address.lat,
        lng: address.lng,
        address: [address.road, address.houseNumber].filter(Boolean).join(", "),
        neighborhood: address.neighborhood,
        city: address.city,
      });
    }
    return { source: "manual", fields, osmAttribution: address !== null };
  }

  async function resolveAt(point: LatLng, name: string, extra: Partial<RestaurantInput>, source: RestaurantDraft["source"]) {
    const candidates = await swallow(deps.osm.nearby(point, MATCH_RADIUS_M), []);
    const match = name.trim() ? pickMatch(name, candidates, point) : nearest(candidates, point, COORDS_ONLY_RADIUS_M);
    if (match) return fromOsmPlace(match, extra, source);
    return manualDraft(name, point, extra);
  }

  async function resolveGoogle(googlePlaceId: string, query: string, session?: string): Promise<RestaurantDraft> {
    const found = await deps.findExisting({ googlePlaceId });
    if (found) return existing(found);
    if (!deps.google) return manualDraft(query, null, { googlePlaceId });

    let point: LatLng;
    try {
      point = await deps.google.location(googlePlaceId, session);
    } catch {
      return manualDraft(query, null, { googlePlaceId });
    }
    return resolveAt(point, query, { googlePlaceId }, "google+osm");
  }

  async function resolveLink(mapsUrl: string): Promise<RestaurantDraft> {
    const expanded = await expandMapsUrl(mapsUrl, fetcher);
    const parsed = parseMapsUrl(expanded);
    if (!parsed) throw new InvalidMapsUrl();
    const point = parsed.lat !== undefined && parsed.lng !== undefined ? { lat: parsed.lat, lng: parsed.lng } : undefined;
    const name = parsed.name ?? "";

    if (deps.google && (name || point)) {
      const key = `${name}|${point?.lat ?? ""},${point?.lng ?? ""}`;
      let placeId = linkToPlaceId.get(key);
      if (placeId === undefined) {
        placeId = await swallow(deps.google.findPlaceId(name || `${point?.lat},${point?.lng}`, point), null);
        linkToPlaceId.set(key, placeId);
      }
      if (placeId) return resolveGoogle(placeId, name);
    }

    if (point) return resolveAt(point, name, {}, "osm");
    if (name) {
      const suggestions = await swallow(deps.osm.search(name), []);
      const first = suggestions[0];
      if (first?.osmRef) return resolveOsm(first.osmRef, name);
      return manualDraft(name, null, {});
    }
    throw new InvalidMapsUrl();
  }

  async function resolveOsm(osmRef: string, query: string): Promise<RestaurantDraft> {
    const found = await deps.findExisting({ osmRef });
    if (found) return existing(found);
    const place = await swallow(deps.osm.lookup(osmRef), null);
    if (!place) return manualDraft(query, null, {});
    return fromOsmPlace(place, {}, "osm");
  }

  return {
    autocomplete: async ({ q, session, near }) => {
      if (deps.google) {
        try {
          return { source: "google", suggestions: await deps.google.autocomplete(q, session, near) };
        } catch (error) {
          if (!(error instanceof PlacesUnavailable)) throw error;
        }
      }
      return { source: "osm", suggestions: await swallow(deps.osm.search(q, near), []) };
    },

    resolve: (input) => {
      if ("googlePlaceId" in input) return resolveGoogle(input.googlePlaceId, input.query, input.session);
      if ("mapsUrl" in input) return resolveLink(input.mapsUrl);
      return resolveOsm(input.osmRef, input.query);
    },

    live: async (googlePlaceId) => {
      if (!deps.google) throw new PlacesUnavailable();
      return deps.google.live(googlePlaceId);
    },
  };
}
