import { dishRatings, restaurantRatings, withUser } from "@pap/db";
import { RESTAURANT_CRITERIA, dishRatingInputSchema, restaurantRatingInputSchema } from "@pap/shared";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { toDishRating, toRating } from "../plates/queries";
import type { AppDeps, AppEnv } from "../types";
import { validate } from "../validate";
import { findDish } from "./dishes";
import { routeId, withRestaurant } from "./restaurants";

const toNumeric = (value: number | null | undefined) => (value === null || value === undefined ? null : String(value));

/** Avaliações: uma por pessoa, por restaurante e por prato. PUT cria ou substitui. */
export function ratingRoutes(deps: Pick<AppDeps, "db" | "storage">) {
  const { db } = deps;
  const app = new Hono<AppEnv>();

  app.put("/restaurants/:id/rating", validate("json", restaurantRatingInputSchema), async (c) => {
    const user = c.get("user");
    const restaurantId = routeId(c.req.param("id"));
    const input = c.req.valid("json");
    const criteria = Object.fromEntries(RESTAURANT_CRITERIA.map((key) => [key, toNumeric(input[key])])) as Record<
      (typeof RESTAURANT_CRITERIA)[number],
      string | null
    >;
    const values = { ...criteria, review: input.review, isPrivate: input.isPrivate, updatedAt: new Date() };

    const rating = await withRestaurant(deps, user, restaurantId, { edit: false }, async (ctx) => {
      const [row] = await ctx.tx
        .insert(restaurantRatings)
        .values({ restaurantId, userId: user.id, ...values })
        .onConflictDoUpdate({ target: [restaurantRatings.restaurantId, restaurantRatings.userId], set: values })
        .returning();
      if (!row) throw new Error("A avaliação não foi salva.");
      return toRating(row);
    });
    return c.json(rating);
  });

  app.delete("/restaurants/:id/rating", async (c) => {
    const user = c.get("user");
    const restaurantId = routeId(c.req.param("id"));
    await withUser(db, { sub: user.id }, (tx) =>
      tx
        .delete(restaurantRatings)
        .where(and(eq(restaurantRatings.restaurantId, restaurantId), eq(restaurantRatings.userId, user.id))),
    );
    return c.body(null, 204);
  });

  app.put("/dishes/:id/rating", validate("json", dishRatingInputSchema), async (c) => {
    const user = c.get("user");
    const dishId = routeId(c.req.param("id"));
    const input = c.req.valid("json");
    const values = {
      rating: String(input.rating),
      comment: input.comment,
      wouldOrderAgain: input.wouldOrderAgain ?? null,
      isPrivate: input.isPrivate,
      updatedAt: new Date(),
    };
    const rating = await withUser(db, { sub: user.id }, async (tx) => {
      await findDish(tx, dishId);
      const [row] = await tx
        .insert(dishRatings)
        .values({ dishId, userId: user.id, ...values })
        .onConflictDoUpdate({ target: [dishRatings.dishId, dishRatings.userId], set: values })
        .returning();
      if (!row) throw new Error("A nota não foi salva.");
      return toDishRating(row);
    });
    return c.json(rating);
  });

  app.delete("/dishes/:id/rating", async (c) => {
    const user = c.get("user");
    const dishId = routeId(c.req.param("id"));
    await withUser(db, { sub: user.id }, (tx) =>
      tx.delete(dishRatings).where(and(eq(dishRatings.dishId, dishId), eq(dishRatings.userId, user.id))),
    );
    return c.body(null, 204);
  });

  return app;
}
