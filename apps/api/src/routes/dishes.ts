import { type Tx, dishes, withUser } from "@pap/db";
import { dishInputSchema, dishPatchSchema } from "@pap/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { notFound } from "../errors";
import { assertOwnPhoto, removePhotos } from "../plates/paths";
import { canEditRestaurant, toDish } from "../plates/queries";
import type { AppDeps, AppEnv } from "../types";
import { validate } from "../validate";
import { forbidden, routeId, withRestaurant } from "./restaurants";

/** Prato visível a qualquer usuário logado; 404 se não existir. */
export async function findDish(tx: Tx, dishId: string) {
  const [dish] = await tx.select().from(dishes).where(eq(dishes.id, dishId));
  if (!dish) throw notFound("Prato não encontrado.");
  return dish;
}

/** Pratos: só quem pode editar o restaurante cria, edita e apaga. */
export function dishRoutes(deps: Pick<AppDeps, "db" | "storage">) {
  const { db, storage } = deps;
  const app = new Hono<AppEnv>();

  app.post("/restaurants/:id/dishes", validate("json", dishInputSchema), async (c) => {
    const user = c.get("user");
    const restaurantId = routeId(c.req.param("id"));
    const input = c.req.valid("json");
    assertOwnPhoto(input.photoPath, "dish", user.id);
    const dish = await withRestaurant(deps, user, restaurantId, { edit: true }, async (ctx) => {
      const [row] = await ctx.tx
        .insert(dishes)
        .values({ ...input, restaurantId, createdBy: user.id })
        .returning();
      if (!row) throw new Error("O prato não foi criado.");
      return toDish(row, storage, true);
    });
    return c.json(dish, 201);
  });

  app.patch("/dishes/:id", validate("json", dishPatchSchema), async (c) => {
    const user = c.get("user");
    const dishId = routeId(c.req.param("id"));
    const patch = c.req.valid("json");
    assertOwnPhoto(patch.photoPath, "dish", user.id);

    let replaced: string | null = null;
    const dish = await withUser(db, { sub: user.id }, async (tx) => {
      const current = await findDish(tx, dishId);
      if (!(await canEditRestaurant(tx, current.restaurantId))) throw forbidden();
      if (patch.photoPath !== undefined && current.photoPath && current.photoPath !== patch.photoPath) {
        replaced = current.photoPath;
      }
      const [row] = await tx
        .update(dishes)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(dishes.id, dishId))
        .returning();
      if (!row) throw forbidden();
      return toDish(row, storage, true);
    });
    await removePhotos(storage, [replaced]);
    return c.json(dish);
  });

  app.delete("/dishes/:id", async (c) => {
    const user = c.get("user");
    const dishId = routeId(c.req.param("id"));
    const photo = await withUser(db, { sub: user.id }, async (tx) => {
      const current = await findDish(tx, dishId);
      if (!(await canEditRestaurant(tx, current.restaurantId))) throw forbidden();
      await tx.delete(dishes).where(eq(dishes.id, dishId));
      return current.photoPath;
    });
    await removePhotos(storage, [photo]);
    return c.body(null, 204);
  });

  return app;
}
