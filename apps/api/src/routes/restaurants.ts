import {
  type Db,
  dishRatings,
  dishes,
  restaurantRatings,
  restaurantPhotos,
  restaurantWishlist,
  restaurants,
  visitPhotos,
  visits,
  withUser,
} from "@pap/db";
import {
  type RestaurantFields,
  addPhotoSchema,
  createRestaurantSchema,
  restaurantListQuerySchema,
  restaurantPatchSchema,
} from "@pap/shared";
import { and, count, eq, inArray, ne } from "drizzle-orm";
import { Hono } from "hono";
import { ApiFailure, PG_UNIQUE_VIOLATION, conflict, notFound, pgErrorCode } from "../errors";
import { createFindExisting } from "../places/existing";
import { type OwnedPhoto, assertOwnPhoto, removePhotos } from "../plates/paths";
import {
  type PlatesContext,
  canEditRestaurant,
  listPins,
  listSummaries,
  loadDetail,
  photoOf,
  restaurantExists,
} from "../plates/queries";
import { insertVisit } from "../plates/visits";
import type { AppDeps, AppEnv } from "../types";
import { validate } from "../validate";

export const forbidden = (message = "Só quem cadastrou o restaurante pode mudar isso.") =>
  new ApiFailure(403, "forbidden", message);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lê e valida o `:id` da rota (um id malformado é 404, não 500). */
export function routeId(value: string | undefined): string {
  if (!value || !UUID.test(value)) throw notFound("Restaurante não encontrado.");
  return value;
}

/** Campos do restaurante para o banco (só os que vieram, numa edição). */
function columnsOf(fields: Partial<RestaurantFields>) {
  const { lat, lng, priceLevel, googlePlaceId, osmRef, coverPath, ...rest } = fields;
  return {
    ...rest,
    ...(lat !== undefined ? { lat } : {}),
    ...(lng !== undefined ? { lng } : {}),
    ...(priceLevel !== undefined ? { priceLevel } : {}),
    ...(googlePlaceId !== undefined ? { googlePlaceId } : {}),
    ...(osmRef !== undefined ? { osmRef } : {}),
    ...(coverPath !== undefined ? { coverPath } : {}),
  };
}

/**
 * Abre a transação com a identidade do usuário e confere se o restaurante
 * existe (404) e, quando pedido, se ele pode editar (403).
 */
export async function withRestaurant<T>(
  deps: Pick<AppDeps, "db" | "storage">,
  user: { id: string; email: string | null },
  restaurantId: string,
  options: { edit: boolean },
  fn: (ctx: PlatesContext) => Promise<T>,
): Promise<T> {
  return withUser(deps.db, { sub: user.id, email: user.email }, async (tx) => {
    const ctx: PlatesContext = { tx, userId: user.id, storage: deps.storage };
    if (!(await restaurantExists(tx, restaurantId))) throw notFound("Restaurante não encontrado.");
    if (options.edit && !(await canEditRestaurant(tx, restaurantId))) throw forbidden();
    return fn(ctx);
  });
}

/** Todas as fotos ligadas ao restaurante, de qualquer pessoa, com o dono de cada linha. */
async function photosOf(db: Db, restaurantId: string): Promise<OwnedPhoto[]> {
  const [restaurant] = await db
    .select({ coverPath: restaurants.coverPath, createdBy: restaurants.createdBy })
    .from(restaurants)
    .where(eq(restaurants.id, restaurantId));
  const own = await db
    .select({ path: restaurantPhotos.path, ownerId: restaurantPhotos.ownerId })
    .from(restaurantPhotos)
    .where(eq(restaurantPhotos.restaurantId, restaurantId));
  const dishPhotos = await db
    .select({ path: dishes.photoPath, ownerId: dishes.createdBy })
    .from(dishes)
    .where(eq(dishes.restaurantId, restaurantId));
  const visitIds = (await db.select({ id: visits.id }).from(visits).where(eq(visits.restaurantId, restaurantId))).map(
    (row) => row.id,
  );
  const fromVisits =
    visitIds.length > 0
      ? await db
          .select({ path: visitPhotos.path, ownerId: visitPhotos.ownerId })
          .from(visitPhotos)
          .where(inArray(visitPhotos.visitId, visitIds))
      : [];
  const cover: OwnedPhoto[] = restaurant ? [{ path: restaurant.coverPath, ownerId: restaurant.createdBy }] : [];
  return [...cover, ...own, ...dishPhotos, ...fromVisits];
}

/** Outras pessoas têm visita, nota ou "quero ir" neste restaurante? */
async function usedByOthers(db: Db, restaurantId: string, userId: string): Promise<boolean> {
  const checks = await Promise.all([
    db.select({ id: visits.id }).from(visits).where(and(eq(visits.restaurantId, restaurantId), ne(visits.userId, userId))).limit(1),
    db
      .select({ id: restaurantRatings.id })
      .from(restaurantRatings)
      .where(and(eq(restaurantRatings.restaurantId, restaurantId), ne(restaurantRatings.userId, userId)))
      .limit(1),
    db
      .select({ id: restaurantWishlist.id })
      .from(restaurantWishlist)
      .where(and(eq(restaurantWishlist.restaurantId, restaurantId), ne(restaurantWishlist.userId, userId)))
      .limit(1),
    db
      .select({ id: dishRatings.id })
      .from(dishRatings)
      .innerJoin(dishes, eq(dishes.id, dishRatings.dishId))
      .where(and(eq(dishes.restaurantId, restaurantId), ne(dishRatings.userId, userId)))
      .limit(1),
  ]);
  return checks.some((rows) => rows.length > 0);
}

export function restaurantRoutes(deps: Pick<AppDeps, "db" | "storage">) {
  const { db, storage } = deps;
  const app = new Hono<AppEnv>();
  const findExisting = createFindExisting(db);

  /** Caderno com filtros, ordenação e paginação. */
  app.get("/restaurants", validate("query", restaurantListQuerySchema), async (c) => {
    const user = c.get("user");
    const filters = c.req.valid("query");
    const page = await withUser(db, { sub: user.id }, (tx) => listSummaries({ tx, userId: user.id, storage }, filters));
    return c.json(page);
  });

  /** Pins do mapa. */
  app.get("/restaurants/map", async (c) => {
    const user = c.get("user");
    const pins = await withUser(db, { sub: user.id }, (tx) => listPins({ tx, userId: user.id, storage }));
    return c.json({ pins });
  });

  /** Cadastro: cria o restaurante e a visita de hoje ou o item do "quero ir". */
  app.post("/restaurants", validate("json", createRestaurantSchema), async (c) => {
    const user = c.get("user");
    const { destination, wishlist, visit, ...fields } = c.req.valid("json");
    assertOwnPhoto(fields.coverPath, "restaurant", user.id);

    try {
      const id = await withUser(db, { sub: user.id, email: user.email }, async (tx) => {
        const ctx: PlatesContext = { tx, userId: user.id, storage };
        const [row] = await tx
          .insert(restaurants)
          .values({ ...columnsOf(fields), name: fields.name, createdBy: user.id })
          .returning({ id: restaurants.id });
        if (!row) throw new Error("O restaurante não foi criado.");
        if (destination === "fomos") {
          await insertVisit(ctx, row.id, visit ?? {});
        } else {
          await tx.insert(restaurantWishlist).values({
            restaurantId: row.id,
            userId: user.id,
            reason: wishlist?.reason ?? "",
            priority: wishlist?.priority ?? "media",
          });
        }
        return row.id;
      });
      return c.json({ id }, 201);
    } catch (error) {
      if (pgErrorCode(error) !== PG_UNIQUE_VIOLATION) throw error;
      const existingId = await findExisting({
        googlePlaceId: fields.googlePlaceId ?? undefined,
        osmRef: fields.osmRef ?? undefined,
      });
      throw conflict("restaurant_exists", "Esse restaurante já está no PAP.", existingId ? { id: existingId } : undefined);
    }
  });

  /** Página do restaurante. */
  app.get("/restaurants/:id", async (c) => {
    const user = c.get("user");
    const id = routeId(c.req.param("id"));
    const detail = await withUser(db, { sub: user.id }, (tx) => loadDetail({ tx, userId: user.id, storage }, id));
    if (!detail) throw notFound("Restaurante não encontrado.");
    return c.json(detail);
  });

  /** Edição (só quem pode editar). */
  app.patch("/restaurants/:id", validate("json", restaurantPatchSchema), async (c) => {
    const user = c.get("user");
    const id = routeId(c.req.param("id"));
    const patch = c.req.valid("json");
    assertOwnPhoto(patch.coverPath, "restaurant", user.id);

    let replacedCover: OwnedPhoto | null = null;
    try {
      const detail = await withRestaurant(deps, user, id, { edit: true }, async (ctx) => {
        if (patch.coverPath !== undefined) {
          const [current] = await ctx.tx
            .select({ coverPath: restaurants.coverPath, createdBy: restaurants.createdBy })
            .from(restaurants)
            .where(eq(restaurants.id, id));
          if (current?.coverPath && current.coverPath !== patch.coverPath) {
            replacedCover = { path: current.coverPath, ownerId: current.createdBy };
          }
        }
        await ctx.tx
          .update(restaurants)
          .set({ ...columnsOf(patch), updatedAt: new Date() })
          .where(eq(restaurants.id, id));
        return loadDetail(ctx, id);
      });
      await removePhotos(storage, [replacedCover]);
      return c.json(detail);
    } catch (error) {
      if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) {
        throw conflict("restaurant_exists", "Outro restaurante já usa esse lugar do Google ou do OpenStreetMap.");
      }
      throw error;
    }
  });

  /** Exclusão (só quem pode editar). Leva visitas, pratos, notas e fotos junto. */
  app.delete("/restaurants/:id", async (c) => {
    const user = c.get("user");
    const id = routeId(c.req.param("id"));
    // Coletadas antes da transação (incluem fotos de visitas de outras pessoas,
    // que o RLS esconde); só são apagadas se a exclusão for autorizada.
    // Lidos antes da transação (com a conexão sem RLS, que enxerga as linhas de
    // todo mundo); só valem se a exclusão for autorizada logo abaixo.
    const photos = await photosOf(db, id);
    const shared = await usedByOthers(db, id, user.id);
    await withRestaurant(deps, user, id, { edit: true }, async (ctx) => {
      // O restaurante é compartilhado: apagar levaria o diário de outras pessoas junto.
      if (shared) {
        throw conflict(
          "restaurant_in_use",
          "Outras pessoas já registraram visitas ou notas neste restaurante, então ele não pode ser apagado.",
        );
      }
      await ctx.tx.delete(restaurants).where(eq(restaurants.id, id));
    });
    await removePhotos(storage, photos);
    return c.body(null, 204);
  });

  /** Nova foto do restaurante (só quem pode editar). */
  app.post("/restaurants/:id/photos", validate("json", addPhotoSchema), async (c) => {
    const user = c.get("user");
    const id = routeId(c.req.param("id"));
    const { path } = c.req.valid("json");
    const photo = await withRestaurant(deps, user, id, { edit: true }, async (ctx) => {
      assertOwnPhoto(path, "restaurant", user.id);
      const [{ total } = { total: 0 }] = await ctx.tx
        .select({ total: count() })
        .from(restaurantPhotos)
        .where(eq(restaurantPhotos.restaurantId, id));
      const [row] = await ctx.tx
        .insert(restaurantPhotos)
        .values({ restaurantId: id, ownerId: user.id, path, position: total })
        .returning();
      if (!row) throw new Error("A foto não foi salva.");
      return photoOf(storage, row.id, row.path);
    });
    return c.json(photo, 201);
  });

  /** Remove uma foto do restaurante (só quem pode editar). */
  app.delete("/restaurants/:id/photos/:photoId", async (c) => {
    const user = c.get("user");
    const id = routeId(c.req.param("id"));
    const photoId = routeId(c.req.param("photoId"));
    const removed = await withRestaurant(deps, user, id, { edit: true }, async (ctx) => {
      const [row] = await ctx.tx
        .delete(restaurantPhotos)
        .where(and(eq(restaurantPhotos.id, photoId), eq(restaurantPhotos.restaurantId, id)))
        .returning({ path: restaurantPhotos.path, ownerId: restaurantPhotos.ownerId });
      if (!row) throw notFound("Foto não encontrada.");
      return row;
    });
    await removePhotos(storage, [removed]);
    return c.body(null, 204);
  });

  return app;
}
