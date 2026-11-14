import { describe, expect, it } from "vitest";
import {
  GOOGLE_AUTOCOMPLETE,
  GOOGLE_LOCATION,
  GOOGLE_SEARCH_TEXT,
  NOMINATIM_REVERSE,
  NOMINATIM_SEARCH,
  OVERPASS_NEARBY,
  fakeFetch,
  json,
} from "./fixtures";
import { createGooglePlaces } from "./google";
import { InvalidMapsUrl, expandMapsUrl, parseMapsUrl } from "./maps-url";
import { nameSimilarity, pickMatch } from "./match";
import { createOsm } from "./osm";
import { createPlacesService } from "./service";

const SESSION = "6f1c1b7e-8a0f-4c51-9d55-3b0f0c3d2e11";

/** Rotas padrão: Google, Nominatim e Overpass respondendo com as fixtures. */
const defaultRoutes = () => [
  { match: "places.googleapis.com/v1/places:autocomplete", respond: () => json(GOOGLE_AUTOCOMPLETE) },
  { match: "places.googleapis.com/v1/places:searchText", respond: () => json(GOOGLE_SEARCH_TEXT) },
  { match: "places.googleapis.com/v1/places/", respond: () => json(GOOGLE_LOCATION) },
  { match: "nominatim.openstreetmap.org/search", respond: () => json(NOMINATIM_SEARCH) },
  { match: "nominatim.openstreetmap.org/reverse", respond: () => json(NOMINATIM_REVERSE) },
  { match: "overpass-api.de", respond: () => json(OVERPASS_NEARBY) },
];

function setup(options: { google?: "ok" | "none" | 429 | "timeout"; existing?: string | null } = {}) {
  const routes = defaultRoutes();
  if (options.google === 429) {
    routes.unshift({ match: "places.googleapis.com", respond: () => json({ error: { status: "RESOURCE_EXHAUSTED" } }, 429) });
  }
  if (options.google === "timeout") {
    routes.unshift({
      match: "places.googleapis.com",
      respond: () => {
        throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
      },
    });
  }
  const fake = fakeFetch(routes);
  const google = options.google === "none" ? null : createGooglePlaces({ apiKey: "test-key", fetch: fake.fetch });
  const osm = createOsm({ fetch: fake.fetch, sleep: async () => {} });
  const lookups: unknown[] = [];
  const service = createPlacesService({
    google,
    osm,
    fetch: fake.fetch,
    findExisting: async (by) => {
      lookups.push(by);
      return options.existing ?? null;
    },
  });
  return { service, calls: fake.calls, lookups };
}

describe("autocomplete", () => {
  it("usa o Google quando ele responde", async () => {
    const { service } = setup();
    const result = await service.autocomplete({ q: "bar do ze", session: SESSION });
    expect(result.source).toBe("google");
    expect(result.suggestions[0]).toMatchObject({ source: "google", googlePlaceId: "ChIJ-bar-do-ze", primary: "Bar do Zé" });
  });

  it.each([
    ["sem cota (429)", 429 as const],
    ["sem chave", "none" as const],
    ["fora do ar (timeout)", "timeout" as const],
  ])("cai no OpenStreetMap quando o Google está %s", async (_label, google) => {
    const { service } = setup({ google });
    const result = await service.autocomplete({ q: "bar do ze", session: SESSION });
    expect(result.source).toBe("osm");
    expect(result.suggestions[0]).toMatchObject({ source: "osm", osmRef: "node/1001", primary: "Bar do Zé" });
  });

  it("filtra o que não é lugar de comer", async () => {
    const { service } = setup({ google: "none" });
    const result = await service.autocomplete({ q: "bar do ze", session: SESSION });
    expect(result.suggestions.map((item) => item.osmRef)).not.toContain("way/9999");
  });
});

describe("resolve com place_id do Google", () => {
  it("pede ao Google só a localização e preenche com o OpenStreetMap", async () => {
    const { service, calls } = setup();
    const draft = await service.resolve({ googlePlaceId: "ChIJ-bar-do-ze", query: "Bar do Ze", session: SESSION });

    const details = calls.find((call) => call.url.includes("places.googleapis.com/v1/places/ChIJ-bar-do-ze"));
    expect(new Headers(details?.init?.headers).get("x-goog-fieldmask")).toBe("location,formattedAddress");

    expect(draft.source).toBe("google+osm");
    expect(draft.osmAttribution).toBe(true);
    expect(draft.fields).toMatchObject({
      name: "Bar do Zé",
      googlePlaceId: "ChIJ-bar-do-ze",
      osmRef: "node/1001",
      phone: "+55 11 3333-4444",
      neighborhood: "Pinheiros",
      city: "São Paulo",
      cuisines: ["brazilian", "regional"],
    });
  });

  it("sem par no OpenStreetMap, devolve rascunho manual com o nome digitado e o ponto do OSM mais próximo", async () => {
    const { service } = setup();
    const draft = await service.resolve({ googlePlaceId: "ChIJ-bar-do-ze", query: "Cantina Inexistente", session: SESSION });
    expect(draft.source).toBe("manual");
    expect(draft.fields.name).toBe("Cantina Inexistente");
    expect(draft.fields.phone ?? "").toBe("");
    // Coordenadas vêm do OSM (reverse), não do Google.
    expect(draft.fields.lat).toBe(NOMINATIM_REVERSE.lat === undefined ? undefined : Number(NOMINATIM_REVERSE.lat));
    expect(draft.fields.city).toBe("São Paulo");
  });

  it("restaurante já cadastrado volta direto, sem consultar o OpenStreetMap", async () => {
    const { service, calls } = setup({ existing: "rest-1" });
    const draft = await service.resolve({ googlePlaceId: "ChIJ-bar-do-ze", query: "Bar do Ze" });
    expect(draft.existingId).toBe("rest-1");
    expect(calls.some((call) => call.url.includes("overpass"))).toBe(false);
  });
});

describe("resolve com link do Google Maps", () => {
  it("lê nome e coordenadas do link e acha o lugar", async () => {
    const { service } = setup();
    const draft = await service.resolve({
      mapsUrl: "https://www.google.com/maps/place/Bar+do+Z%C3%A9/@-23.5617,-46.6912,17z/data=!3m1",
    });
    expect(draft.fields.name).toBe("Bar do Zé");
    expect(draft.fields.osmRef).toBe("node/1001");
  });

  it("recusa link que não é do Google Maps", async () => {
    const { service } = setup();
    await expect(service.resolve({ mapsUrl: "https://exemplo.com/x" })).rejects.toBeInstanceOf(InvalidMapsUrl);
  });
});

describe("parseMapsUrl", () => {
  it("lê /maps/place/NOME/@lat,lng", () => {
    expect(parseMapsUrl("https://www.google.com/maps/place/Bar+do+Z%C3%A9/@-23.55,-46.63,17z/data=!4m6")).toEqual({
      name: "Bar do Zé",
      lat: -23.55,
      lng: -46.63,
    });
  });

  it("prefere as coordenadas exatas !3d!4d", () => {
    expect(
      parseMapsUrl("https://www.google.com/maps/place/X/@-23.5,-46.6,17z/data=!3m1!4b1!4m5!3m4!8m2!3d-23.5612!4d-46.6901"),
    ).toMatchObject({ lat: -23.5612, lng: -46.6901 });
  });

  it("lê ?q=lat,lng", () => {
    expect(parseMapsUrl("https://maps.google.com/?q=-23.5,-46.6")).toEqual({ lat: -23.5, lng: -46.6 });
  });

  it("lê ?q=nome", () => {
    expect(parseMapsUrl("https://www.google.com.br/maps?q=Bar+do+Z%C3%A9")).toEqual({ name: "Bar do Zé" });
  });

  it("lê ?cid=", () => {
    expect(parseMapsUrl("https://maps.google.com/?cid=1234567890")).toEqual({ cid: "1234567890" });
  });

  it("recusa outros sites", () => {
    expect(parseMapsUrl("https://exemplo.com/x")).toBeNull();
    expect(parseMapsUrl("https://google.com.evil.example/maps/place/X/@1,2,3z")).toBeNull();
  });
});

describe("expandMapsUrl", () => {
  it("segue o link curto até o Google Maps", async () => {
    const fake = fakeFetch([
      {
        match: "maps.app.goo.gl/abc",
        respond: () =>
          new Response(null, { status: 302, headers: { location: "https://www.google.com/maps/place/X/@1,2,3z" } }),
      },
    ]);
    await expect(expandMapsUrl("https://maps.app.goo.gl/abc", fake.fetch)).resolves.toBe(
      "https://www.google.com/maps/place/X/@1,2,3z",
    );
  });

  it("recusa redirecionamento para outro site", async () => {
    const fake = fakeFetch([
      {
        match: "maps.app.goo.gl/mal",
        respond: () => new Response(null, { status: 302, headers: { location: "https://exemplo.com/phishing" } }),
      },
    ]);
    await expect(expandMapsUrl("https://maps.app.goo.gl/mal", fake.fetch)).rejects.toBeInstanceOf(InvalidMapsUrl);
  });
});

describe("semelhança de nomes", () => {
  it("ignora acentos, caixa e palavras genéricas", () => {
    expect(nameSimilarity("Restaurante Bar do Zé", "bar do ze")).toBeGreaterThanOrEqual(0.9);
  });

  it("nomes diferentes ficam longe", () => {
    expect(nameSimilarity("Sushi Leblon", "Padaria Real")).toBeLessThan(0.3);
  });

  it("escolhe o candidato parecido mais perto", () => {
    const candidates = [
      { osmRef: "node/1", name: "Bar do Zé", lat: -23.6, lng: -46.7, tags: {} },
      { osmRef: "node/2", name: "Bar do Zé", lat: -23.5617, lng: -46.6912, tags: {} },
      { osmRef: "node/3", name: "Padaria Real", lat: -23.5617, lng: -46.6912, tags: {} },
    ];
    expect(pickMatch("bar do ze", candidates, { lat: -23.5617, lng: -46.6912 })?.osmRef).toBe("node/2");
    expect(pickMatch("cantina", candidates, { lat: -23.5617, lng: -46.6912 })).toBeNull();
  });
});

describe("Nominatim", () => {
  it("espera 1 segundo entre duas buscas", async () => {
    let clock = 0;
    const waits: number[] = [];
    const fake = fakeFetch(defaultRoutes());
    const osm = createOsm({
      fetch: fake.fetch,
      now: () => clock,
      sleep: async (ms) => {
        waits.push(ms);
        clock += ms;
      },
    });
    await osm.search("bar um");
    await osm.search("bar dois");
    expect(waits).toEqual([1000]);
  });

  it("identifica o app no User-Agent, sem dados pessoais", async () => {
    const fake = fakeFetch(defaultRoutes());
    const osm = createOsm({ fetch: fake.fetch, sleep: async () => {} });
    await osm.search("bar do ze");
    expect(new Headers(fake.calls[0]?.init?.headers).get("user-agent")).toBe("PlotsAndPlates/1.0");
  });
});

describe("painel ao vivo", () => {
  it("sem Google, avisa que está indisponível", async () => {
    const { service } = setup({ google: "none" });
    await expect(service.live("ChIJ-bar-do-ze")).rejects.toThrow();
  });
});

describe("Google", () => {
  it("o autocomplete manda session token e restringe ao Brasil", async () => {
    const fake = fakeFetch(defaultRoutes());
    const google = createGooglePlaces({ apiKey: "k", fetch: fake.fetch });
    await google.autocomplete("bar", SESSION);
    const body = JSON.parse(String(fake.calls[0]?.init?.body));
    expect(body).toMatchObject({ input: "bar", sessionToken: SESSION, includedRegionCodes: ["br"], languageCode: "pt-BR" });
  });
});
