import { type Db, restaurants } from "@pap/db";
import { eq } from "drizzle-orm";
import type { FindExisting } from "./service";

/**
 * Procura um restaurante já cadastrado pelo place_id do Google ou pela
 * referência do OSM. Restaurantes são legíveis por qualquer usuário logado,
 * então a consulta não depende de quem está buscando.
 */
export function createFindExisting(db: Db): FindExisting {
  return async ({ googlePlaceId, osmRef }) => {
    if (googlePlaceId) {
      const [row] = await db
        .select({ id: restaurants.id })
        .from(restaurants)
        .where(eq(restaurants.googlePlaceId, googlePlaceId))
        .limit(1);
      if (row) return row.id;
    }
    if (osmRef) {
      const [row] = await db.select({ id: restaurants.id }).from(restaurants).where(eq(restaurants.osmRef, osmRef)).limit(1);
      if (row) return row.id;
    }
    return null;
  };
}
