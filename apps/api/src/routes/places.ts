import { autocompleteQuerySchema, parseNear, placeResolveSchema } from "@pap/shared";
import { Hono } from "hono";
import { ApiFailure, badRequest } from "../errors";
import { PlacesUnavailable } from "../places/google";
import { InvalidMapsUrl } from "../places/maps-url";
import { rateLimit } from "../rate-limit";
import type { AppDeps, AppEnv } from "../types";
import { validate } from "../validate";

/** Limites próprios da busca (custa cota do Google e respeita o Nominatim). */
const SEARCH_PER_MINUTE = 60;
/** O painel ao vivo usa o SKU mais caro do Google. */
const LIVE_PER_MINUTE = 10;

export function placesRoutes({ places }: Pick<AppDeps, "places">) {
  const app = new Hono<AppEnv>();
  const userKey = (prefix: string) => (c: { get: (key: "user") => { id: string } }) => `${prefix}:${c.get("user").id}`;

  app.use("/places/*", rateLimit({ windowMs: 60_000, max: SEARCH_PER_MINUTE, key: userKey("places") }));

  /** Sugestões enquanto o usuário digita: Google, ou OpenStreetMap se o Google falhar. */
  app.get("/places/autocomplete", validate("query", autocompleteQuerySchema), async (c) => {
    const { q, session, near } = c.req.valid("query");
    return c.json(await places.autocomplete({ q, session, near: parseNear(near) }));
  });

  /** Restaurante já cadastrado ou rascunho para o formulário. */
  app.post("/places/resolve", validate("json", placeResolveSchema), async (c) => {
    try {
      return c.json(await places.resolve(c.req.valid("json")));
    } catch (error) {
      if (error instanceof InvalidMapsUrl) throw new ApiFailure(400, "invalid_maps_url", error.message);
      throw error;
    }
  });

  /** Painel "Ver no Google": dados ao vivo, sem salvar nem guardar em cache. */
  app.get(
    "/places/:googlePlaceId/live",
    rateLimit({ windowMs: 60_000, max: LIVE_PER_MINUTE, key: userKey("live") }),
    async (c) => {
      const placeId = c.req.param("googlePlaceId");
      if (!/^[\w-]{1,300}$/.test(placeId)) throw badRequest("Lugar inválido.");
      try {
        c.header("cache-control", "no-store");
        return c.json(await places.live(placeId));
      } catch (error) {
        if (error instanceof PlacesUnavailable) {
          throw new ApiFailure(503, "google_unavailable", "Os dados do Google não estão disponíveis agora.");
        }
        throw error;
      }
    },
  );

  return app;
}
