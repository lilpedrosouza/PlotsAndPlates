/**
 * Respostas de exemplo do Google Places, Nominatim e Overpass, e um `fetch`
 * falso que as serve. Usados nos testes e no modo local offline (`PAP_OFFLINE=1`).
 */

export type FakeCall = { url: string; init?: RequestInit };
export type FakeRoute = {
  /** Trecho da URL que identifica a rota. */
  match: string;
  respond: (call: FakeCall) => Response | Promise<Response>;
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** `fetch` que responde pelas rotas na ordem dada e registra as chamadas. */
export function fakeFetch(routes: FakeRoute[]) {
  const calls: FakeCall[] = [];
  const fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const call = { url, init };
    calls.push(call);
    const route = routes.find((candidate) => url.includes(candidate.match));
    if (!route) throw new Error(`Rota não simulada: ${url}`);
    return route.respond(call);
  }) as typeof globalThis.fetch;
  return { fetch, calls };
}

export const GOOGLE_AUTOCOMPLETE = {
  suggestions: [
    {
      placePrediction: {
        placeId: "ChIJ-bar-do-ze",
        text: { text: "Bar do Zé, Rua dos Pinheiros, 100 - Pinheiros, São Paulo - SP" },
        structuredFormat: {
          mainText: { text: "Bar do Zé" },
          secondaryText: { text: "Rua dos Pinheiros, 100 - Pinheiros, São Paulo - SP" },
        },
      },
    },
    { queryPrediction: { text: { text: "bar do zé perto de mim" } } },
  ],
};

export const GOOGLE_LOCATION = {
  location: { latitude: -23.5617, longitude: -46.6912 },
  formattedAddress: "R. dos Pinheiros, 100 - Pinheiros, São Paulo - SP, Brasil",
};

export const GOOGLE_SEARCH_TEXT = { places: [{ id: "ChIJ-bar-do-ze" }] };

export const GOOGLE_LIVE = {
  nationalPhoneNumber: "(11) 3333-4444",
  websiteUri: "https://bardoze.example",
  regularOpeningHours: { weekdayDescriptions: ["segunda-feira: 12:00 – 23:00"] },
  googleMapsUri: "https://maps.google.com/?cid=1",
  photos: [{ name: "places/ChIJ-bar-do-ze/photos/p1", authorAttributions: [{ displayName: "Fulano" }] }],
};

export const NOMINATIM_SEARCH = [
  {
    osm_type: "node",
    osm_id: 1001,
    lat: "-23.5617",
    lon: "-46.6912",
    category: "amenity",
    type: "restaurant",
    name: "Bar do Zé",
    display_name: "Bar do Zé, 100, Rua dos Pinheiros, Pinheiros, São Paulo, Região Metropolitana de São Paulo, Brasil",
    address: { road: "Rua dos Pinheiros", house_number: "100", suburb: "Pinheiros", city: "São Paulo" },
  },
  {
    osm_type: "way",
    osm_id: 9999,
    lat: "-23.5",
    lon: "-46.6",
    category: "highway",
    type: "residential",
    name: "Rua do Zé",
    display_name: "Rua do Zé, São Paulo, Brasil",
    address: { road: "Rua do Zé", city: "São Paulo" },
  },
];

export const NOMINATIM_REVERSE = {
  lat: "-23.56175",
  lon: "-46.69118",
  address: { road: "Rua dos Pinheiros", house_number: "100", suburb: "Pinheiros", city: "São Paulo" },
};

export const OVERPASS_NEARBY = {
  elements: [
    {
      type: "node",
      id: 1001,
      lat: -23.5617,
      lon: -46.6912,
      tags: {
        amenity: "restaurant",
        name: "Bar do Zé",
        cuisine: "brazilian;regional",
        phone: "+55 11 3333-4444",
        "addr:street": "Rua dos Pinheiros",
        "addr:housenumber": "100",
        opening_hours: "Mo-Sa 12:00-23:00",
      },
    },
    {
      type: "way",
      id: 1002,
      center: { lat: -23.5619, lon: -46.6915 },
      tags: { amenity: "cafe", name: "Café Central", website: "cafecentral.example" },
    },
  ],
};

/** Rotas usadas no modo local sem internet. */
export const OFFLINE_ROUTES: FakeRoute[] = [
  { match: "nominatim.openstreetmap.org/search", respond: () => json(NOMINATIM_SEARCH) },
  { match: "nominatim.openstreetmap.org/reverse", respond: () => json(NOMINATIM_REVERSE) },
  { match: "overpass-api.de", respond: () => json(OVERPASS_NEARBY) },
];
