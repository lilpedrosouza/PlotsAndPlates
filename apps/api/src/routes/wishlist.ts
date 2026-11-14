import { restaurantWishlist, withUser } from "@pap/db";
import { type WishlistItem, type WishlistPriority, fomosInputSchema, wishlistInputSchema } from "@pap/shared";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { conflict } from "../errors";
import { loadVisits } from "../plates/queries";
import { insertVisit } from "../plates/visits";
import type { AppDeps, AppEnv } from "../types";
import { validate } from "../validate";
import { routeId, withRestaurant } from "./restaurants";

/** "Quero ir" de cada pessoa e o botão "Fomos!". */
export function wishlistRoutes(deps: Pick<AppDeps, "db" | "storage">) {
  const { db } = deps;
  const app = new Hono<AppEnv>();

  app.put("/restaurants/:id/wishlist", validate("json", wishlistInputSchema), async (c) => {
    const user = c.get("user");
    const restaurantId = routeId(c.req.param("id"));
    const input = c.req.valid("json");
    const item = await withRestaurant(deps, user, restaurantId, { edit: false }, async (ctx) => {
      const [row] = await ctx.tx
        .insert(restaurantWishlist)
        .values({ restaurantId, userId: user.id, reason: input.reason, priority: input.priority })
        .onConflictDoUpdate({
          target: [restaurantWishlist.restaurantId, restaurantWishlist.userId],
          set: { reason: input.reason, priority: input.priority },
        })
        .returning();
      if (!row) throw new Error("O item não foi salvo.");
      const body: WishlistItem = {
        priority: row.priority as WishlistPriority,
        reason: row.reason,
        createdAt: row.createdAt.toISOString(),
        addedBy: [],
      };
      return body;
    });
    return c.json(item);
  });

  app.delete("/restaurants/:id/wishlist", async (c) => {
    const user = c.get("user");
    const restaurantId = routeId(c.req.param("id"));
    await withUser(db, { sub: user.id }, (tx) =>
      tx
        .delete(restaurantWishlist)
        .where(and(eq(restaurantWishlist.restaurantId, restaurantId), eq(restaurantWishlist.userId, user.id))),
    );
    return c.body(null, 204);
  });

  /** "Fomos!": tira do "quero ir" e cria a visita, na mesma transação. */
  app.post("/restaurants/:id/fomos", validate("json", fomosInputSchema), async (c) => {
    const user = c.get("user");
    const restaurantId = routeId(c.req.param("id"));
    const { visitedOn } = c.req.valid("json");
    const visit = await withRestaurant(deps, user, restaurantId, { edit: false }, async (ctx) => {
      const removed = await ctx.tx
        .delete(restaurantWishlist)
        .where(and(eq(restaurantWishlist.restaurantId, restaurantId), eq(restaurantWishlist.userId, user.id)))
        .returning({ id: restaurantWishlist.id });
      if (removed.length === 0) throw conflict("not_in_wishlist", "Esse restaurante não está no seu quero ir.");
      const id = await insertVisit(ctx, restaurantId, { visitedOn });
      const [created] = await loadVisits(ctx, restaurantId, [id]);
      return created;
    });
    return c.json({ visit }, 201);
  });

  return app;
}
