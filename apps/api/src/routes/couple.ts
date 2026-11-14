import { coupleInvites, coupleMembers, profiles } from "@pap/db";
import { type CoupleState, type Invite, inviteInputSchema } from "@pap/shared";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { PG_UNIQUE_VIOLATION, badRequest, conflict, notFound, pgErrorCode } from "../errors";
import { partnerOf, peopleById } from "../couples/partner";
import type { AppDeps, AppEnv } from "../types";
import { validate } from "../validate";
import { toPublicProfile } from "./profiles";
import { routeId } from "./restaurants";

const alreadyPaired = () => conflict("already_paired", "Você já tem par. Desfaça o vínculo antes de convidar outra pessoa.");
const targetPaired = () => conflict("target_paired", "Essa pessoa já tem par.");

/**
 * Vínculo de casal. Os convites e o casal são gravados pela API (dona das
 * tabelas) depois de validar as regras: cada pessoa em no máximo um casal.
 */
export function coupleRoutes(deps: Pick<AppDeps, "db" | "storage">) {
  const { db, storage } = deps;
  const app = new Hono<AppEnv>();

  async function invitesFor(userId: string): Promise<{ outgoing: Invite[]; incoming: Invite[] }> {
    const rows = await db
      .select()
      .from(coupleInvites)
      .where(and(eq(coupleInvites.status, "pending"), or(eq(coupleInvites.fromUser, userId), eq(coupleInvites.toUser, userId))))
      .orderBy(desc(coupleInvites.createdAt));
    const people = await peopleById(db, rows.flatMap((row) => [row.fromUser, row.toUser]), storage);
    const toInvite = (row: (typeof rows)[number]): Invite | null => {
      const from = people.get(row.fromUser);
      const to = people.get(row.toUser);
      return from && to ? { id: row.id, from, to, createdAt: row.createdAt.toISOString() } : null;
    };
    return {
      outgoing: rows.filter((row) => row.fromUser === userId).map(toInvite).filter((invite) => invite !== null),
      incoming: rows.filter((row) => row.toUser === userId).map(toInvite).filter((invite) => invite !== null),
    };
  }

  app.get("/couple", async (c) => {
    const user = c.get("user");
    const partnerId = await partnerOf(db, user.id);
    const [partner] = partnerId ? await db.select().from(profiles).where(eq(profiles.id, partnerId)) : [];
    const [membership] = await db.select({ createdAt: coupleMembers.createdAt }).from(coupleMembers).where(eq(coupleMembers.userId, user.id));
    const body: CoupleState = {
      partner: partner ? toPublicProfile(partner, storage) : null,
      since: partner && membership ? membership.createdAt.toISOString() : null,
      ...(await invitesFor(user.id)),
    };
    return c.json(body);
  });

  app.post("/couple/invites", validate("json", inviteInputSchema), async (c) => {
    const user = c.get("user");
    const { username } = c.req.valid("json");
    const [target] = await db.select().from(profiles).where(eq(profiles.username, username));
    if (!target) throw notFound("Ninguém com esse @username.");
    if (target.id === user.id) throw badRequest("Você não pode convidar a si mesmo.", { username: "Esse é você." });
    if (await partnerOf(db, user.id)) throw alreadyPaired();
    if (await partnerOf(db, target.id)) throw targetPaired();
    const [reverse] = await db
      .select({ id: coupleInvites.id })
      .from(coupleInvites)
      .where(and(eq(coupleInvites.fromUser, target.id), eq(coupleInvites.toUser, user.id), eq(coupleInvites.status, "pending")));
    if (reverse) throw conflict("invite_exists", "Essa pessoa já te convidou: é só aceitar o convite.");
    try {
      const [row] = await db.insert(coupleInvites).values({ fromUser: user.id, toUser: target.id }).returning();
      const people = await peopleById(db, [user.id, target.id], storage);
      const invite: Invite = { id: row!.id, from: people.get(user.id)!, to: people.get(target.id)!, createdAt: row!.createdAt.toISOString() };
      return c.json(invite, 201);
    } catch (error) {
      if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) throw conflict("invite_exists", "Você já convidou essa pessoa.");
      throw error;
    }
  });

  /** Convite pendente em que quem chama tem o papel pedido (de quem convidou ou de quem foi convidado). */
  async function pendingInvite(inviteId: string, userId: string, role: "from" | "to") {
    const [invite] = await db
      .select()
      .from(coupleInvites)
      .where(
        and(
          eq(coupleInvites.id, inviteId),
          eq(coupleInvites.status, "pending"),
          role === "from" ? eq(coupleInvites.fromUser, userId) : eq(coupleInvites.toUser, userId),
        ),
      );
    if (!invite) throw notFound("Convite não encontrado.");
    return invite;
  }

  app.post("/couple/invites/:id/accept", async (c) => {
    const user = c.get("user");
    const invite = await pendingInvite(routeId(c.req.param("id")), user.id, "to");
    try {
      await db.transaction(async (tx) => {
        if (await partnerOf(tx, user.id)) throw alreadyPaired();
        if (await partnerOf(tx, invite.fromUser)) throw targetPaired();
        const coupleId = randomUUID();
        await tx.insert(coupleMembers).values([
          { coupleId, userId: invite.fromUser },
          { coupleId, userId: invite.toUser },
        ]);
        await tx.update(coupleInvites).set({ status: "accepted", respondedAt: new Date() }).where(eq(coupleInvites.id, invite.id));
        // Os outros convites pendentes das duas pessoas deixam de valer.
        const people = [invite.fromUser, invite.toUser];
        await tx
          .update(coupleInvites)
          .set({ status: "declined", respondedAt: new Date() })
          .where(
            and(eq(coupleInvites.status, "pending"), or(inArray(coupleInvites.fromUser, people), inArray(coupleInvites.toUser, people))),
          );
      });
    } catch (error) {
      // Corrida: alguém entrou em outro casal no meio do caminho.
      if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) throw alreadyPaired();
      throw error;
    }
    return c.json({ ok: true });
  });

  app.post("/couple/invites/:id/decline", async (c) => {
    const user = c.get("user");
    const invite = await pendingInvite(routeId(c.req.param("id")), user.id, "to");
    await db.update(coupleInvites).set({ status: "declined", respondedAt: new Date() }).where(eq(coupleInvites.id, invite.id));
    return c.json({ ok: true });
  });

  app.post("/couple/invites/:id/cancel", async (c) => {
    const user = c.get("user");
    const invite = await pendingInvite(routeId(c.req.param("id")), user.id, "from");
    await db.update(coupleInvites).set({ status: "cancelled", respondedAt: new Date() }).where(eq(coupleInvites.id, invite.id));
    return c.json({ ok: true });
  });

  /** Desfaz o vínculo para os dois. Nada é apagado: cada um fica com o que é seu. */
  app.delete("/couple", async (c) => {
    const user = c.get("user");
    const [mine] = await db.select({ coupleId: coupleMembers.coupleId }).from(coupleMembers).where(eq(coupleMembers.userId, user.id));
    if (!mine) throw notFound("Você não tem par.");
    await db.delete(coupleMembers).where(eq(coupleMembers.coupleId, mine.coupleId));
    return c.body(null, 204);
  });

  return app;
}
