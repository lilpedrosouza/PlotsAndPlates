import type { LivePlace, PlaceSuggestion } from "@pap/shared";
import type { LatLng } from "./match";

/**
 * Google Places API (New), usada só como localizador (caminho 1): do Google o
 * PAP guarda apenas o `place_id`. Toda chamada pede o mínimo de campos
 * (field mask) para cair nos SKUs mais baratos.
 */

export class PlacesUnavailable extends Error {
  constructor(message = "A busca do Google não está disponível agora.") {
    super(message);
    this.name = "PlacesUnavailable";
  }
}

export type GooglePlaces = {
  autocomplete: (q: string, session: string, near?: LatLng) => Promise<PlaceSuggestion[]>;
  /** Só localização e endereço formatado (SKU Essentials), usados sem salvar. */
  location: (placeId: string, session?: string) => Promise<LatLng & { formattedAddress: string }>;
  /** Text Search pedindo só o id (SKU IDs Only). */
  findPlaceId: (text: string, near?: LatLng) => Promise<string | null>;
  /** Painel "Ver no Google": exibido ao vivo, nunca salvo nem guardado em cache. */
  live: (placeId: string) => Promise<LivePlace>;
};

const BASE = "https://places.googleapis.com/v1";
/** Tipos principais aceitos no autocomplete (máximo de 5 pela API). */
const FOOD_TYPES = ["restaurant", "cafe", "bar", "bakery", "meal_takeaway"];
const LIVE_PHOTOS = 3;

type AutocompleteResponse = {
  suggestions?: {
    placePrediction?: {
      placeId: string;
      text?: { text: string };
      structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } };
    };
  }[];
};

type LiveResponse = {
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  photos?: { name: string; authorAttributions?: { displayName?: string }[] }[];
};

const bias = (near: LatLng | undefined, radius: number) =>
  near ? { locationBias: { circle: { center: { latitude: near.lat, longitude: near.lng }, radius } } } : {};

export function createGooglePlaces(options: { apiKey: string; fetch?: typeof fetch; timeoutMs?: number }): GooglePlaces {
  const fetcher = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? 4000;

  async function call<T>(path: string, init: { method?: string; body?: unknown; fieldMask?: string }): Promise<T> {
    let response: Response;
    try {
      response = await fetcher(`${BASE}${path}`, {
        method: init.method ?? "GET",
        headers: {
          "x-goog-api-key": options.apiKey,
          ...(init.fieldMask ? { "x-goog-fieldmask": init.fieldMask } : {}),
          ...(init.body !== undefined ? { "content-type": "application/json" } : {}),
        },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new PlacesUnavailable();
    }
    if (!response.ok) throw new PlacesUnavailable(`Google Places respondeu ${response.status}.`);
    return (await response.json()) as T;
  }

  return {
    autocomplete: async (q, session, near) => {
      const data = await call<AutocompleteResponse>("/places:autocomplete", {
        method: "POST",
        body: {
          input: q,
          sessionToken: session,
          includedPrimaryTypes: FOOD_TYPES,
          includedRegionCodes: ["br"],
          languageCode: "pt-BR",
          ...bias(near, 30_000),
        },
      });
      return (data.suggestions ?? []).flatMap((suggestion) => {
        const prediction = suggestion.placePrediction;
        if (!prediction) return [];
        const primary = prediction.structuredFormat?.mainText?.text ?? prediction.text?.text ?? "";
        return [
          {
            id: `google:${prediction.placeId}`,
            source: "google" as const,
            primary,
            secondary: prediction.structuredFormat?.secondaryText?.text ?? "",
            googlePlaceId: prediction.placeId,
          },
        ];
      });
    },

    location: async (placeId, session) => {
      const query = session ? `?sessionToken=${encodeURIComponent(session)}` : "";
      const data = await call<{ location?: { latitude: number; longitude: number }; formattedAddress?: string }>(
        `/places/${encodeURIComponent(placeId)}${query}`,
        { fieldMask: "location,formattedAddress" },
      );
      if (!data.location) throw new PlacesUnavailable("O Google não devolveu a localização.");
      return { lat: data.location.latitude, lng: data.location.longitude, formattedAddress: data.formattedAddress ?? "" };
    },

    findPlaceId: async (text, near) => {
      const data = await call<{ places?: { id: string }[] }>("/places:searchText", {
        method: "POST",
        fieldMask: "places.id",
        body: { textQuery: text, languageCode: "pt-BR", regionCode: "br", pageSize: 1, ...bias(near, 200) },
      });
      return data.places?.[0]?.id ?? null;
    },

    live: async (placeId) => {
      const data = await call<LiveResponse>(`/places/${encodeURIComponent(placeId)}`, {
        fieldMask: "nationalPhoneNumber,websiteUri,regularOpeningHours.weekdayDescriptions,photos,googleMapsUri",
      });
      const photos = await Promise.all(
        (data.photos ?? []).slice(0, LIVE_PHOTOS).map(async (photo) => {
          const media = await call<{ photoUri?: string }>(`/${photo.name}/media?maxWidthPx=800&skipHttpRedirect=true`, {});
          return media.photoUri
            ? { url: media.photoUri, attribution: photo.authorAttributions?.[0]?.displayName ?? "Google" }
            : null;
        }),
      );
      return {
        phone: data.nationalPhoneNumber,
        website: data.websiteUri,
        openingHours: data.regularOpeningHours?.weekdayDescriptions,
        photos: photos.filter((photo) => photo !== null),
        mapsUrl: data.googleMapsUri ?? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`,
      };
    },
  };
}
