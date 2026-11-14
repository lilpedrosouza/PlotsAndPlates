import { dishes, visitDishes, visitPhotos, visits } from "@pap/db";
import { todayIso } from "@pap/shared";
import { and, eq, inArray } from "drizzle-orm";
import { partnerOf } from "../couples/partner";
import { badRequest } from "../errors";
import { assertOwnPhoto } from "./paths";
import type { PlatesContext } from "./queries";

export type NewVisit = {
  visitedOn?: string;
  occasion?: string;
  amountCents?: number | null;
  dishIds?: string[];
  photoPaths?: string[];
  /** "Fomos juntos". Ausente: juntos se houver par. */
  together?: boolean;
};

/** Confere que os pratos são deste restaurante. */
export async function assertDishesOf(ctx: PlatesContext, restaurantId: string, dishIds: readonly string[]) {
  if (dishIds.length === 0) return;
  const found = await ctx.tx
    .select({ id: dishes.id })
    .from(dishes)
    .where(and(eq(dishes.restaurantId, restaurantId), inArray(dishes.id, [...dishIds])));
  if (found.length !== new Set(dishIds).size) {
    throw badRequest("Algum prato não é deste restaurante.", { dishIds: "Prato inválido." });
  }
}

/** Cria a visita de quem está logado, com fotos e pratos pedidos. Devolve o id. */
export async function insertVisit(ctx: PlatesContext, restaurantId: string, input: NewVisit): Promise<string> {
  const dishIds = [...new Set(input.dishIds ?? [])];
  const photoPaths = input.photoPaths ?? [];
  for (const path of photoPaths) assertOwnPhoto(path, "visit", ctx.userId);
  await assertDishesOf(ctx, restaurantId, dishIds);
  const together = input.together ?? Boolean(await partnerOf(ctx.tx, ctx.userId));

  const [visit] = await ctx.tx
    .insert(visits)
    .values({
      restaurantId,
      userId: ctx.userId,
      visitedOn: input.visitedOn ?? todayIso(),
      occasion: input.occasion ?? "",
      amountCents: input.amountCents ?? null,
      together,
    })
    .returning({ id: visits.id });
  if (!visit) throw new Error("A visita não foi criada.");

  if (photoPaths.length > 0) {
    await ctx.tx.insert(visitPhotos).values(photoPaths.map((path) => ({ visitId: visit.id, ownerId: ctx.userId, path })));
  }
  if (dishIds.length > 0) {
    await ctx.tx.insert(visitDishes).values(dishIds.map((dishId) => ({ visitId: visit.id, dishId })));
  }
  return visit.id;
}
