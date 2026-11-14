import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withUser } from "./client";
import { profiles } from "./schema";
import { type TestDb, createTestDb } from "./testing";

const ANA = "11111111-1111-4111-8111-111111111111";
const BIA = "22222222-2222-4222-8222-222222222222";

let test: TestDb;

beforeAll(async () => {
  test = await createTestDb();
  await test.createAuthUser(ANA);
  await test.createAuthUser(BIA);
  await withUser(test.db, { sub: ANA }, (tx) =>
    tx.insert(profiles).values({ id: ANA, username: "ana", displayName: "Ana" }),
  );
  await withUser(test.db, { sub: BIA }, (tx) =>
    tx.insert(profiles).values({ id: BIA, username: "bia", displayName: "Bia" }),
  );
});

afterAll(async () => {
  await test.close();
});

describe("RLS em profiles", () => {
  it("a tabela está com RLS ativada", async () => {
    const rows = await test.db
      .select({ enabled: sql<boolean>`relrowsecurity` })
      .from(sql`pg_class`)
      .where(sql`oid = 'public.profiles'::regclass`);
    expect(rows[0]?.enabled).toBe(true);
  });

  it("um usuário autenticado lê os perfis de todo mundo", async () => {
    const rows = await withUser(test.db, { sub: ANA }, (tx) => tx.select().from(profiles));
    expect(rows.map((row) => row.username).sort()).toEqual(["ana", "bia"]);
  });

  it("cada um edita o próprio perfil", async () => {
    const updated = await withUser(test.db, { sub: ANA }, (tx) =>
      tx.update(profiles).set({ bio: "Sempre pede sobremesa." }).where(eq(profiles.id, ANA)).returning(),
    );
    expect(updated).toHaveLength(1);
    expect(updated[0]?.bio).toBe("Sempre pede sobremesa.");
  });

  it("ninguém edita o perfil de outra pessoa", async () => {
    const updated = await withUser(test.db, { sub: ANA }, (tx) =>
      tx.update(profiles).set({ bio: "invadido" }).where(eq(profiles.id, BIA)).returning(),
    );
    expect(updated).toHaveLength(0);

    const [bia] = await withUser(test.db, { sub: BIA }, (tx) =>
      tx.select().from(profiles).where(eq(profiles.id, BIA)),
    );
    expect(bia?.bio).toBe("");
  });

  it("ninguém cria um perfil em nome de outra conta", async () => {
    const caio = "33333333-3333-4333-8333-333333333333";
    await test.createAuthUser(caio);
    await expect(
      withUser(test.db, { sub: ANA }, (tx) =>
        tx.insert(profiles).values({ id: caio, username: "caio", displayName: "Caio" }),
      ),
    ).rejects.toThrow();
  });

  it("ninguém transfere o próprio perfil para outro id", async () => {
    const dani = "44444444-4444-4444-8444-444444444444";
    await test.createAuthUser(dani);
    await expect(
      withUser(test.db, { sub: ANA }, (tx) => tx.update(profiles).set({ id: dani }).where(eq(profiles.id, ANA))),
    ).rejects.toThrow();
  });

  it("ninguém apaga perfis, nem o próprio (sem permissão de delete)", async () => {
    await expect(
      withUser(test.db, { sub: ANA }, (tx) => tx.delete(profiles).where(eq(profiles.id, ANA)).returning()),
    ).rejects.toThrow();
    const [stillThere] = await test.db.select().from(profiles).where(eq(profiles.id, ANA));
    expect(stillThere).toBeDefined();
  });

  it("o papel anônimo não lê nem escreve", async () => {
    await expect(
      test.db.transaction(async (tx) => {
        await tx.execute(sql`set local role anon`);
        return tx.select().from(profiles);
      }),
    ).rejects.toThrow();

    await expect(
      test.db.transaction(async (tx) => {
        await tx.execute(sql`set local role anon`);
        await tx.insert(profiles).values({ id: BIA, username: "anonimo", displayName: "Anônimo" });
      }),
    ).rejects.toThrow();
  });
});

describe("restrições de profiles", () => {
  it("o @username é único", async () => {
    const eva = "55555555-5555-4555-8555-555555555555";
    await test.createAuthUser(eva);
    await expect(
      withUser(test.db, { sub: eva }, (tx) =>
        tx.insert(profiles).values({ id: eva, username: "ana", displayName: "Eva" }),
      ),
    ).rejects.toThrow();
  });

  it.each(["Ana", "an", "1ana", "ana maria", "ana-maria", "a".repeat(21)])(
    "recusa o @username inválido %j",
    async (username) => {
      const id = "66666666-6666-4666-8666-666666666666";
      await test.db.execute(sql`insert into auth.users (id) values (${id}) on conflict do nothing`);
      await expect(
        withUser(test.db, { sub: id }, (tx) => tx.insert(profiles).values({ id, username, displayName: "Teste" })),
      ).rejects.toThrow();
    },
  );

  it("o perfil some quando a conta é apagada", async () => {
    const fabi = "77777777-7777-4777-8777-777777777777";
    await test.createAuthUser(fabi);
    await withUser(test.db, { sub: fabi }, (tx) =>
      tx.insert(profiles).values({ id: fabi, username: "fabi", displayName: "Fabi" }),
    );
    await test.db.execute(sql`delete from auth.users where id = ${fabi}`);
    const rows = await test.db.select().from(profiles).where(eq(profiles.id, fabi));
    expect(rows).toHaveLength(0);
  });
});
