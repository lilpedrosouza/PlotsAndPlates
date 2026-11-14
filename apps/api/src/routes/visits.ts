import { visitDishes, visitPhotos, visits, withUser } from "@pap/db";
import { visitInputSchema, visitPatchSchema } from "@pap/shared";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { Hono } from "hono";
import { notFound } from "../errors";
import { type OwnedPhoto, assertOwnPhoto, removePhotos } from "../plates/paths";
import { type PlatesContext, loadVisits } from "../plates/queries";
import { assertDishesOf, insertVisit } from "../plates/visits";
import type { AppDeps, AppEnv } from "../types";
import { validate } from "../validate";
import { routeId, withRestaurant } from "./restaurants";

/** Visitas: cada pessoa registra, edita e apaga só as próprias. */
export function visitRoutes(deps: Pick<AppDeps, "db" | "storage">) {
  const { db, storage } = deps;
  const app = new Hono<AppEnv>();

  app.post("/restaurants/:id/visits", validate("json", visitInputSchema), async (c) => {
    const user = c.get("user");
    const restaurantId = routeId(c.req.param("id"));
    const input = c.req.valid("json");
    const visit = await withRestaurant(deps, user, restaurantId, { edit: false }, async (ctx) => {
      const id = await insertVisit(ctx, restaurantId, input);
      const [created] = await loadVisits(ctx, restaurantId, [id]);
      return created;
    });
    return c.json(visit, 201);
  });

  app.patch("/visits/:id", validate("json", visitPatchSchema), async (c) => {
    const user = c.get("user");
    const visitId = routeId(c.req.param("id"));
    const { dishIds, photoPaths, ...fields } = c.req.valid("json");
    for (const path of photoPaths ?? []) assertOwnPhoto(path, "visit", user.id);

    let dropped: OwnedPhoto[] = [];
    const visit = await withUser(db, { sub: user.id }, async (tx) => {
      const ctx: PlatesContext = { tx, userId: user.id, storage };
      // O RLS só mostra as visitas da própria pessoa: a dos outros é 404.
      const [current] = await tx.select().from(visits).where(eq(visits.id, visitId));
      if (!current) throw notFound("Visita não encontrada.");

      if (Object.keys(fields).length > 0) {
        await tx
          .update(visits)
          .set({ ...fields, updatedAt: new Date() })
          .where(eq(visits.id, visitId));
      }
      if (dishIds !== undefined) {
        const unique = [...new Set(dishIds)];
        await assertDishesOf(ctx, current.restaurantId, unique);
        await tx.delete(visitDishes).where(eq(visitDishes.visitId, visitId));
        if (unique.length > 0) await tx.insert(visitDishes).values(unique.map((dishId) => ({ visitId, dishId })));
      }
      if (photoPaths !== undefined) {
        const keep = photoPaths.length > 0 ? notInArray(visitPhotos.path, photoPaths) : undefined;
        const removed = await tx
          .delete(visitPhotos)
          .where(and(eq(visitPhotos.visitId, visitId), keep))
          .returning({ path: visitPhotos.path, ownerId: visitPhotos.ownerId });
        dropped = removed;
        const existing = await tx
          .select({ path: visitPhotos.path })
          .from(visitPhotos)
          .where(and(eq(visitPhotos.visitId, visitId), photoPaths.length > 0 ? inArray(visitPhotos.path, photoPaths) : undefined));
        const known = new Set(existing.map((row) => row.path));
        const added = photoPaths.filter((path) => !known.has(path));
        if (added.length > 0) {
          await tx.insert(visitPhotos).values(added.map((path) => ({ visitId, ownerId: user.id, path })));
        }
      }
      const [updated] = await loadVisits(ctx, current.restaurantId, [visitId]);
      return updated;
    });
    await removePhotos(storage, dropped);
    return c.json(visit);
  });

  app.delete("/visits/:id", async (c) => {
    const user = c.get("user");
    const visitId = routeId(c.req.param("id"));
    const paths = await withUser(db, { sub: user.id }, async (tx) => {
      const [current] = await tx.select().from(visits).where(eq(visits.id, visitId));
      if (!current) throw notFound("Visita não encontrada.");
      const photos = await tx
        .select({ path: visitPhotos.path, ownerId: visitPhotos.ownerId })
        .from(visitPhotos)
        .where(eq(visitPhotos.visitId, visitId));
      await tx.delete(visits).where(eq(visits.id, visitId));
      return photos;
    });
    await removePhotos(storage, paths);
    return c.body(null, 204);
  });

  return app;
}
