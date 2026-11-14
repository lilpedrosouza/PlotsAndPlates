import { randomUUID } from "node:crypto";
import { type Profile, profiles, withUser } from "@pap/db";
import {
  type AccentKey,
  type MeResponse,
  type OwnProfile,
  type PublicProfile,
  type SignedUpload,
  type StreamingKey,
  type UploadKind,
  PHOTO_UPLOAD_KINDS,
  createProfileSchema,
  searchProfilesSchema,
  signUploadSchema,
  thumbPathOf,
  updateProfileSchema,
  usernameSchema,
} from "@pap/shared";
import { eq, ilike, or } from "drizzle-orm";
import { Hono } from "hono";
import { PG_UNIQUE_VIOLATION, badRequest, conflict, notFound, pgErrorCode } from "../errors";
import type { MediaStorage } from "../storage";
import type { AppDeps, AppEnv } from "../types";
import { validate } from "../validate";

const UPLOAD_FOLDERS: Record<UploadKind, string> = {
  avatar: "avatars",
  banner: "banners",
  restaurant: "restaurants",
  visit: "visits",
  dish: "dishes",
};

function toPublicProfile(row: Profile, storage: MediaStorage): PublicProfile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    bio: row.bio,
    avatarUrl: row.avatarPath ? storage.publicUrl(row.avatarPath) : null,
    bannerUrl: row.bannerPath ? storage.publicUrl(row.bannerPath) : null,
    accent: row.accent as AccentKey,
    createdAt: row.createdAt.toISOString(),
  };
}

function toOwnProfile(row: Profile, storage: MediaStorage): OwnProfile {
  return {
    ...toPublicProfile(row, storage),
    streamings: row.streamings as StreamingKey[],
    avatarPath: row.avatarPath,
    bannerPath: row.bannerPath,
  };
}

const usernameTaken = () =>
  conflict("username_taken", "Esse @username já está em uso.", { username: "Esse @username já está em uso." });

/** Escapa os curingas do LIKE para a busca tratar o texto literalmente. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

export function profileRoutes({ db, storage }: Pick<AppDeps, "db" | "storage">) {
  const app = new Hono<AppEnv>();

  /** Sessão atual: usuário + perfil (ou `null` antes do primeiro acesso). */
  app.get("/me", async (c) => {
    const user = c.get("user");
    const [row] = await withUser(db, { sub: user.id, email: user.email }, (tx) =>
      tx.select().from(profiles).where(eq(profiles.id, user.id)).limit(1),
    );
    const body: MeResponse = { user, profile: row ? toOwnProfile(row, storage) : null };
    return c.json(body);
  });

  /** Primeiro acesso: cria o perfil com @username e nome de exibição. */
  app.post("/me/profile", validate("json", createProfileSchema), async (c) => {
    const user = c.get("user");
    const input = c.req.valid("json");

    try {
      const row = await withUser(db, { sub: user.id, email: user.email }, async (tx) => {
        const [existing] = await tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, user.id));
        if (existing) throw conflict("profile_exists", "Você já tem um perfil.");
        const [created] = await tx
          .insert(profiles)
          .values({ id: user.id, username: input.username, displayName: input.displayName })
          .returning();
        return created;
      });
      if (!row) throw new Error("O perfil não foi criado.");
      return c.json(toOwnProfile(row, storage), 201);
    } catch (error) {
      if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) throw usernameTaken();
      throw error;
    }
  });

  /** Edita o próprio perfil. */
  app.patch("/me/profile", validate("json", updateProfileSchema), async (c) => {
    const user = c.get("user");
    const input = c.req.valid("json");

    // As imagens precisam estar na pasta do próprio usuário.
    for (const [field, kind] of [
      ["avatarPath", "avatar"],
      ["bannerPath", "banner"],
    ] as const) {
      const path = input[field];
      if (path != null && !path.startsWith(`${UPLOAD_FOLDERS[kind]}/${user.id}/`)) {
        throw badRequest("Imagem inválida.", { [field]: "Imagem inválida." });
      }
    }

    try {
      const { before, after } = await withUser(db, { sub: user.id, email: user.email }, async (tx) => {
        const [current] = await tx.select().from(profiles).where(eq(profiles.id, user.id));
        if (!current) throw notFound("Crie seu perfil antes de editar.");
        const [updated] = await tx
          .update(profiles)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(profiles.id, user.id))
          .returning();
        if (!updated) throw new Error("O perfil não foi atualizado.");
        return { before: current, after: updated };
      });

      // Limpa as imagens substituídas; se falhar, só sobra um arquivo órfão.
      const stale = [
        before.avatarPath !== after.avatarPath ? before.avatarPath : null,
        before.bannerPath !== after.bannerPath ? before.bannerPath : null,
      ].filter((path): path is string => path !== null);
      if (stale.length > 0) {
        storage.remove(stale).catch((error: unknown) => {
          console.warn("Não foi possível remover imagens antigas:", error);
        });
      }

      return c.json(toOwnProfile(after, storage));
    } catch (error) {
      if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) throw usernameTaken();
      throw error;
    }
  });

  /** Diz se um @username está livre (para validar enquanto a pessoa digita). */
  app.get("/usernames/:username", async (c) => {
    const user = c.get("user");
    const parsed = usernameSchema.safeParse(c.req.param("username"));
    if (!parsed.success) {
      return c.json({ available: false, reason: parsed.error.issues[0]?.message ?? "Nome inválido." });
    }
    const [owner] = await withUser(db, { sub: user.id }, (tx) =>
      tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.username, parsed.data)).limit(1),
    );
    const available = !owner || owner.id === user.id;
    return c.json(available ? { available } : { available, reason: "Esse @username já está em uso." });
  });

  /** Autoriza o upload direto de uma imagem (avatar ou banner) para o Storage. */
  app.post("/uploads/sign", validate("json", signUploadSchema), async (c) => {
    const user = c.get("user");
    const { kind } = c.req.valid("json");
    const path = `${UPLOAD_FOLDERS[kind]}/${user.id}/${randomUUID()}.webp`;
    const { token } = await storage.createSignedUpload(path);
    const body: SignedUpload = { bucket: storage.bucket, path, token };
    // Fotos de Plates sobem também uma miniatura, para listas e grades.
    if ((PHOTO_UPLOAD_KINDS as readonly string[]).includes(kind)) {
      body.thumbPath = thumbPathOf(path);
      body.thumbToken = (await storage.createSignedUpload(body.thumbPath)).token;
    }
    return c.json(body, 201);
  });

  /** Busca de usuários por nome ou @username. */
  app.get("/profiles", validate("query", searchProfilesSchema), async (c) => {
    const user = c.get("user");
    const { q } = c.req.valid("query");
    const term = escapeLike(q.replace(/^@/, ""));
    const rows = await withUser(db, { sub: user.id }, (tx) =>
      tx
        .select()
        .from(profiles)
        .where(or(ilike(profiles.username, `${term}%`), ilike(profiles.displayName, `%${term}%`)))
        .orderBy(profiles.username)
        .limit(20),
    );
    return c.json({ profiles: rows.map((row) => toPublicProfile(row, storage)) });
  });

  /** Perfil público de um usuário. */
  app.get("/profiles/:username", async (c) => {
    const user = c.get("user");
    const username = c.req.param("username").toLowerCase();
    const [row] = await withUser(db, { sub: user.id }, (tx) =>
      tx.select().from(profiles).where(eq(profiles.username, username)).limit(1),
    );
    if (!row) throw notFound("Não achamos ninguém com esse @username.");
    return c.json(toPublicProfile(row, storage));
  });

  return app;
}
