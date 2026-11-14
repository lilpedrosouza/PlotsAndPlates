import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withUser } from "./client";
import {
  dishRatings,
  dishes,
  profiles,
  restaurantPhotos,
  restaurantRatings,
  restaurantWishlist,
  restaurants,
  visitDishes,
  visitPhotos,
  visits,
} from "./schema";
import { type TestDb, createTestDb } from "./testing";

const ANA = "11111111-1111-4111-8111-111111111111";
const BIA = "22222222-2222-4222-8222-222222222222";

let test: TestDb;
let anaRestaurant: string;
let anaDish: string;

const asAna = <T>(fn: Parameters<typeof withUser<T>>[2]) => withUser(test.db, { sub: ANA }, fn);
const asBia = <T>(fn: Parameters<typeof withUser<T>>[2]) => withUser(test.db, { sub: BIA }, fn);

/** `db.execute` devolve tipos diferentes por driver; nos testes é sempre o do PGlite. */
const rowsOf = <T>(result: unknown) => (result as { rows: T[] }).rows;

const pgCode = (error: unknown): string | undefined => {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth += 1) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string") return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
};

beforeAll(async () => {
  test = await createTestDb();
  for (const [id, username] of [
    [ANA, "ana"],
    [BIA, "bia"],
  ] as const) {
    await test.createAuthUser(id);
    await withUser(test.db, { sub: id }, (tx) => tx.insert(profiles).values({ id, username, displayName: username }));
  }

  const [restaurant] = await asAna((tx) =>
    tx
      .insert(restaurants)
      .values({ createdBy: ANA, name: "Bar do Zé", city: "São Paulo", googlePlaceId: "ChIJ-ze" })
      .returning(),
  );
  anaRestaurant = restaurant!.id;
  const [dish] = await asAna((tx) =>
    tx.insert(dishes).values({ restaurantId: anaRestaurant, createdBy: ANA, name: "Bolinho" }).returning(),
  );
  anaDish = dish!.id;
});

afterAll(async () => {
  await test.close();
});

describe("RLS das tabelas de Plates", () => {
  it("está ligada em todas as tabelas", async () => {
    const names = [
      "restaurants",
      "restaurant_photos",
      "visits",
      "visit_photos",
      "dishes",
      "visit_dishes",
      "dish_ratings",
      "restaurant_ratings",
      "restaurant_wishlist",
    ];
    const rows = rowsOf<{ relname: string; relrowsecurity: boolean }>(
      await test.db.execute(
        sql`select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'`,
      ),
    );
    const enabled = new Map(rows.map((row) => [row.relname, row.relrowsecurity]));
    for (const name of names) expect(enabled.get(name), name).toBe(true);
  });

  it("qualquer usuário logado lê o restaurante de outro", async () => {
    const rows = await asBia((tx) => tx.select().from(restaurants).where(eq(restaurants.id, anaRestaurant)));
    expect(rows).toHaveLength(1);
  });

  it("quem não cadastrou não edita o restaurante", async () => {
    const updated = await asBia((tx) =>
      tx.update(restaurants).set({ name: "Hackeado" }).where(eq(restaurants.id, anaRestaurant)).returning(),
    );
    expect(updated).toHaveLength(0);
  });

  it("quem cadastrou edita o restaurante", async () => {
    const updated = await asAna((tx) =>
      tx.update(restaurants).set({ phone: "11 99999-0000" }).where(eq(restaurants.id, anaRestaurant)).returning(),
    );
    expect(updated[0]?.phone).toBe("11 99999-0000");
  });

  it("quem não cadastrou não cria prato nem foto no restaurante", async () => {
    await expect(
      asBia((tx) => tx.insert(dishes).values({ restaurantId: anaRestaurant, createdBy: BIA, name: "Intruso" })),
    ).rejects.toThrow();
    await expect(
      asBia((tx) =>
        tx.insert(restaurantPhotos).values({ restaurantId: anaRestaurant, ownerId: BIA, path: "restaurants/x/y.webp" }),
      ),
    ).rejects.toThrow();
  });

  it("quem cadastrou cria pratos e fotos", async () => {
    const [photo] = await asAna((tx) =>
      tx
        .insert(restaurantPhotos)
        .values({ restaurantId: anaRestaurant, ownerId: ANA, path: `restaurants/${ANA}/a.webp` })
        .returning(),
    );
    expect(photo?.id).toBeDefined();
  });

  it("visitas, fotos de visita e quero ir são só do dono", async () => {
    const [visit] = await asAna((tx) =>
      tx.insert(visits).values({ restaurantId: anaRestaurant, userId: ANA, visitedOn: "2026-11-01" }).returning(),
    );
    await asAna((tx) => tx.insert(visitDishes).values({ visitId: visit!.id, dishId: anaDish }));
    await asAna((tx) => tx.insert(visitPhotos).values({ visitId: visit!.id, ownerId: ANA, path: `visits/${ANA}/v.webp` }));
    await asAna((tx) => tx.insert(restaurantWishlist).values({ restaurantId: anaRestaurant, userId: ANA, reason: "voltar" }));

    expect(await asBia((tx) => tx.select().from(visits))).toHaveLength(0);
    expect(await asBia((tx) => tx.select().from(visitDishes))).toHaveLength(0);
    expect(await asBia((tx) => tx.select().from(visitPhotos))).toHaveLength(0);
    expect(await asBia((tx) => tx.select().from(restaurantWishlist))).toHaveLength(0);
    expect(await asAna((tx) => tx.select().from(visits))).toHaveLength(1);
  });

  it("ninguém cria visita em nome de outra pessoa", async () => {
    await expect(
      asBia((tx) => tx.insert(visits).values({ restaurantId: anaRestaurant, userId: ANA, visitedOn: "2026-11-01" })),
    ).rejects.toThrow();
  });

  it("nota privada só o dono vê; a pública todos veem", async () => {
    await asAna((tx) =>
      tx.insert(restaurantRatings).values({ restaurantId: anaRestaurant, userId: ANA, food: "4", isPrivate: true }),
    );
    await asBia((tx) =>
      tx.insert(restaurantRatings).values({ restaurantId: anaRestaurant, userId: BIA, food: "3", isPrivate: false }),
    );
    const seenByBia = await asBia((tx) => tx.select().from(restaurantRatings));
    expect(seenByBia.map((row) => row.userId)).toEqual([BIA]);
    const seenByAna = await asAna((tx) => tx.select().from(restaurantRatings));
    expect(seenByAna.map((row) => row.userId).sort()).toEqual([ANA, BIA].sort());
  });

  it("quem não cadastrou pode avaliar os pratos", async () => {
    const [rating] = await asBia((tx) =>
      tx.insert(dishRatings).values({ dishId: anaDish, userId: BIA, rating: "4.5", wouldOrderAgain: true }).returning(),
    );
    expect(rating?.rating).toBe("4.5");
  });

  it("ninguém altera a nota de outra pessoa", async () => {
    const updated = await asBia((tx) =>
      tx.update(restaurantRatings).set({ food: "1" }).where(eq(restaurantRatings.userId, ANA)).returning(),
    );
    expect(updated).toHaveLength(0);
  });

  it("anon não lê restaurantes", async () => {
    await expect(
      test.db.transaction(async (tx) => {
        await tx.execute(sql`set local role anon`);
        return tx.select().from(restaurants);
      }),
    ).rejects.toThrow();
  });
});

describe("regras de nota no banco", () => {
  let restaurantId: string;

  beforeAll(async () => {
    const [row] = await asAna((tx) =>
      tx.insert(restaurants).values({ createdBy: ANA, name: "Cantina da Nota" }).returning(),
    );
    restaurantId = row!.id;
  });

  it("nota geral é a média dos critérios arredondada para meia estrela, empate para cima", async () => {
    const [row] = await asAna((tx) =>
      tx.insert(restaurantRatings).values({ restaurantId, userId: ANA, food: "4", service: "4.5" }).returning(),
    );
    expect(row?.overall).toBe("4.5");
  });

  it("com um critério só, a nota geral é ele", async () => {
    const [row] = await asBia((tx) =>
      tx.insert(restaurantRatings).values({ restaurantId, userId: BIA, food: "4" }).returning(),
    );
    expect(row?.overall).toBe("4.0");
  });

  it("avaliação sem nenhum critério é recusada", async () => {
    const [other] = await asAna((tx) => tx.insert(restaurants).values({ createdBy: ANA, name: "Vazio" }).returning());
    await expect(
      asAna((tx) => tx.insert(restaurantRatings).values({ restaurantId: other!.id, userId: ANA })),
    ).rejects.toThrow();
  });

  it("nota fora da meia estrela é recusada", async () => {
    await expect(
      asBia((tx) => tx.insert(dishRatings).values({ dishId: anaDish, userId: ANA, rating: "4.2" })),
    ).rejects.toThrow();
    const [other] = await asAna((tx) => tx.insert(dishes).values({ restaurantId, createdBy: ANA, name: "X" }).returning());
    await expect(
      asAna((tx) => tx.insert(dishRatings).values({ dishId: other!.id, userId: ANA, rating: "4.2" })),
    ).rejects.toThrow();
  });
});

describe("unicidade e cascata", () => {
  it("o mesmo place_id do Google não entra duas vezes", async () => {
    let caught: unknown;
    try {
      await asBia((tx) => tx.insert(restaurants).values({ createdBy: BIA, name: "Outro Zé", googlePlaceId: "ChIJ-ze" }));
    } catch (error) {
      caught = error;
    }
    expect(pgCode(caught)).toBe("23505");
  });

  it("a mesma referência do OSM não entra duas vezes", async () => {
    await asAna((tx) => tx.insert(restaurants).values({ createdBy: ANA, name: "A", osmRef: "node/42" }));
    let caught: unknown;
    try {
      await asBia((tx) => tx.insert(restaurants).values({ createdBy: BIA, name: "B", osmRef: "node/42" }));
    } catch (error) {
      caught = error;
    }
    expect(pgCode(caught)).toBe("23505");
  });

  it("apagar o restaurante leva visitas, pratos e notas junto", async () => {
    const deleted = await asAna((tx) => tx.delete(restaurants).where(eq(restaurants.id, anaRestaurant)).returning());
    expect(deleted).toHaveLength(1);
    const left = rowsOf<{ n: number }>(await test.db.execute(sql`
      select (select count(*) from visits where restaurant_id = ${anaRestaurant})
           + (select count(*) from dishes where restaurant_id = ${anaRestaurant})
           + (select count(*) from restaurant_ratings where restaurant_id = ${anaRestaurant})
           + (select count(*) from dish_ratings where dish_id = ${anaDish}) as n`));
    expect(Number(left[0]?.n)).toBe(0);
  });

  it("quem não cadastrou não apaga o restaurante", async () => {
    const [row] = await asAna((tx) => tx.insert(restaurants).values({ createdBy: ANA, name: "Fica" }).returning());
    const deleted = await asBia((tx) => tx.delete(restaurants).where(eq(restaurants.id, row!.id)).returning());
    expect(deleted).toHaveLength(0);
  });
});
