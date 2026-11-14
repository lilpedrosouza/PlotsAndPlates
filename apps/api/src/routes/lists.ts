import { type Tx, customLists, listItems, titles, withUser } from "@pap/db";
import {
  type CustomList,
  type CustomListDetail,
  listInputSchema,
  listItemInputSchema,
  listPatchSchema,
  listReorderSchema,
} from "@pap/shared";
import { and, asc, count, desc, eq, max } from "drizzle-orm";
import { Hono } from "hono";
import { ApiFailure, PG_UNIQUE_VIOLATION, badRequest, conflict, notFound, pgErrorCode } from "../errors";
import { findTitle, summaryOf } from "../plots/queries";
import type { AppDeps, AppEnv } from "../types";
import { validate } from "../validate";
import { routeId } from "./restaurants";

const POSTERS_ON_COVER = 4;
const notOwner = () => new ApiFailure(403, "forbidden", "Só quem criou a lista pode mudar ela.");

/** A lista visível para quem pede (o RLS esconde as privadas alheias); 404 se não houver. */
async function findList(tx: Tx, listId: string) {
  const [list] = await tx.select().from(customLists).where(eq(customLists.id, listId));
  if (!list) throw notFound("Lista não encontrada.");
  return list;
}

async function ownList(tx: Tx, listId: string, userId: string) {
  const list = await findList(tx, listId);
  if (list.ownerId !== userId) throw notOwner();
  return list;
}

async function coverOf(tx: Tx, list: typeof customLists.$inferSelect): Promise<CustomList> {
  const [{ total } = { total: 0 }] = await tx.select({ total: count() }).from(listItems).where(eq(listItems.listId, list.id));
  const posters = await tx
    .select({ posterPath: titles.posterPath })
    .from(listItems)
    .innerJoin(titles, eq(titles.id, listItems.titleId))
    .where(eq(listItems.listId, list.id))
    .orderBy(asc(listItems.position))
    .limit(POSTERS_ON_COVER);
  return {
    id: list.id,
    name: list.name,
    description: list.description,
    isPrivate: list.isPrivate,
    itemCount: total,
    posters: posters.map((row) => row.posterPath).filter((path): path is string => Boolean(path)),
  };
}

async function detailOf(tx: Tx, list: typeof customLists.$inferSelect, userId: string): Promise<CustomListDetail> {
  const items = await tx
    .select({ item: listItems, title: titles })
    .from(listItems)
    .innerJoin(titles, eq(titles.id, listItems.titleId))
    .where(eq(listItems.listId, list.id))
    .orderBy(asc(listItems.position), asc(listItems.createdAt));
  return {
    ...(await coverOf(tx, list)),
    isMine: list.ownerId === userId,
    items: items.map(({ item, title }) => ({ id: item.id, note: item.note, title: summaryOf(title) })),
  };
}

/** Listas personalizadas de Plots. */
export function listRoutes(deps: Pick<AppDeps, "db">) {
  const { db } = deps;
  const app = new Hono<AppEnv>();
  const asUser = <T>(userId: string, fn: (tx: Tx) => Promise<T>) => withUser(db, { sub: userId }, fn);

  app.get("/lists", async (c) => {
    const user = c.get("user");
    const lists = await asUser(user.id, async (tx) => {
      const rows = await tx.select().from(customLists).where(eq(customLists.ownerId, user.id)).orderBy(desc(customLists.updatedAt));
      return Promise.all(rows.map((row) => coverOf(tx, row)));
    });
    return c.json({ lists });
  });

  app.post("/lists", validate("json", listInputSchema), async (c) => {
    const user = c.get("user");
    const input = c.req.valid("json");
    const list = await asUser(user.id, async (tx) => {
      const [row] = await tx.insert(customLists).values({ ...input, ownerId: user.id }).returning();
      if (!row) throw new Error("A lista não foi criada.");
      return coverOf(tx, row);
    });
    return c.json(list, 201);
  });

  app.get("/lists/:id", async (c) => {
    const user = c.get("user");
    const listId = routeId(c.req.param("id"));
    const list = await asUser(user.id, async (tx) => detailOf(tx, await findList(tx, listId), user.id));
    return c.json(list);
  });

  app.patch("/lists/:id", validate("json", listPatchSchema), async (c) => {
    const user = c.get("user");
    const listId = routeId(c.req.param("id"));
    const patch = c.req.valid("json");
    const list = await asUser(user.id, async (tx) => {
      await ownList(tx, listId, user.id);
      const [row] = await tx
        .update(customLists)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(customLists.id, listId))
        .returning();
      if (!row) throw notFound("Lista não encontrada.");
      return detailOf(tx, row, user.id);
    });
    return c.json(list);
  });

  app.delete("/lists/:id", async (c) => {
    const user = c.get("user");
    const listId = routeId(c.req.param("id"));
    await asUser(user.id, async (tx) => {
      await ownList(tx, listId, user.id);
      await tx.delete(customLists).where(eq(customLists.id, listId));
    });
    return c.body(null, 204);
  });

  app.post("/lists/:id/items", validate("json", listItemInputSchema), async (c) => {
    const user = c.get("user");
    const listId = routeId(c.req.param("id"));
    const { titleId, note } = c.req.valid("json");
    try {
      const item = await asUser(user.id, async (tx) => {
        await ownList(tx, listId, user.id);
        if (!(await findTitle(tx, titleId))) throw badRequest("Título não encontrado.", { titleId: "Título inválido." });
        const [{ last } = { last: null }] = await tx
          .select({ last: max(listItems.position) })
          .from(listItems)
          .where(eq(listItems.listId, listId));
        const [row] = await tx
          .insert(listItems)
          .values({ listId, titleId, note, position: (last ?? -1) + 1 })
          .returning();
        await tx.update(customLists).set({ updatedAt: new Date() }).where(eq(customLists.id, listId));
        return row;
      });
      return c.json({ id: item?.id, titleId, note }, 201);
    } catch (error) {
      if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) throw conflict("already_in_list", "Esse título já está na lista.");
      throw error;
    }
  });

  app.delete("/lists/:id/items/:itemId", async (c) => {
    const user = c.get("user");
    const listId = routeId(c.req.param("id"));
    const itemId = routeId(c.req.param("itemId"));
    await asUser(user.id, async (tx) => {
      await ownList(tx, listId, user.id);
      const removed = await tx
        .delete(listItems)
        .where(and(eq(listItems.id, itemId), eq(listItems.listId, listId)))
        .returning({ id: listItems.id });
      if (removed.length === 0) throw notFound("Item não encontrado.");
    });
    return c.body(null, 204);
  });

  /** Nova ordem: a lista completa de ids dos itens, na ordem desejada. */
  app.put("/lists/:id/order", validate("json", listReorderSchema), async (c) => {
    const user = c.get("user");
    const listId = routeId(c.req.param("id"));
    const { itemIds } = c.req.valid("json");
    const list = await asUser(user.id, async (tx) => {
      const owned = await ownList(tx, listId, user.id);
      const current = await tx.select({ id: listItems.id }).from(listItems).where(eq(listItems.listId, listId));
      const known = new Set(current.map((row) => row.id));
      if (itemIds.length !== known.size || new Set(itemIds).size !== itemIds.length || itemIds.some((id) => !known.has(id))) {
        throw badRequest("A nova ordem precisa ter todos os itens da lista, uma vez cada.");
      }
      for (const [position, itemId] of itemIds.entries()) {
        await tx.update(listItems).set({ position }).where(and(eq(listItems.id, itemId), eq(listItems.listId, listId)));
      }
      return detailOf(tx, owned, user.id);
    });
    return c.json(list);
  });

  return app;
}
