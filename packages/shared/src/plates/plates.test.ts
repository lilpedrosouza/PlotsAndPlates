import { describe, expect, it } from "vitest";
import {
  type DishWithScore,
  cuisineLabel,
  placeResolveSchema,
  rankDishes,
  restaurantInputSchema,
  restaurantListQuerySchema,
  restaurantRatingInputSchema,
  thumbPathOf,
  visitInputSchema,
} from "./index";

const isoDate = (offsetDays: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

const firstMessage = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues[0]?.message;

describe("restaurantRatingInputSchema", () => {
  it("recusa avaliação sem nenhum critério", () => {
    const result = restaurantRatingInputSchema.safeParse({ review: "bom" });
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe("Dê nota a pelo menos um critério.");
  });

  it("aceita só a nota da comida", () => {
    const result = restaurantRatingInputSchema.safeParse({ food: 4.5 });
    expect(result.success).toBe(true);
    expect(result.data?.isPrivate).toBe(false);
  });

  it("recusa nota fora da meia estrela", () => {
    expect(restaurantRatingInputSchema.safeParse({ food: 4.2 }).success).toBe(false);
  });
});

describe("visitInputSchema", () => {
  it("recusa data no futuro", () => {
    expect(visitInputSchema.safeParse({ visitedOn: isoDate(1) }).success).toBe(false);
  });

  it("aceita hoje", () => {
    expect(visitInputSchema.safeParse({ visitedOn: isoDate(0) }).success).toBe(true);
  });
});

describe("restaurantInputSchema", () => {
  it("recusa referência do OpenStreetMap malformada", () => {
    expect(restaurantInputSchema.safeParse({ name: "Zé", osmRef: "nodo/1" }).success).toBe(false);
  });

  it("recusa site que não é URL", () => {
    expect(restaurantInputSchema.safeParse({ name: "Zé", website: "nao-é-url" }).success).toBe(false);
  });

  it("aceita só o nome", () => {
    expect(restaurantInputSchema.safeParse({ name: "Bar do Zé" }).success).toBe(true);
  });
});

describe("restaurantListQuerySchema", () => {
  it("usa os padrões quando a query vem vazia", () => {
    expect(restaurantListQuerySchema.parse({})).toMatchObject({ status: "todos", sort: "recentes", limit: 24 });
  });

  it("converte números vindos da URL", () => {
    expect(restaurantListQuerySchema.parse({ minRating: "4", price: "2", limit: "10" })).toMatchObject({
      minRating: 4,
      price: 2,
      limit: 10,
    });
  });
});

describe("placeResolveSchema", () => {
  it("aceita um place_id do Google com o texto buscado", () => {
    expect(placeResolveSchema.safeParse({ googlePlaceId: "ChIJ123", query: "bar do zé" }).success).toBe(true);
  });

  it("aceita um link do Maps", () => {
    expect(placeResolveSchema.safeParse({ mapsUrl: "https://maps.app.goo.gl/abc" }).success).toBe(true);
  });

  it("recusa entrada vazia", () => {
    expect(placeResolveSchema.safeParse({}).success).toBe(false);
  });
});

const dish = (id: string, score: number | null, ratingCount: number, name = id): DishWithScore => ({
  id,
  restaurantId: "r",
  name,
  description: "",
  priceCents: null,
  category: "principal",
  photo: null,
  canEdit: false,
  score,
  ratingCount,
  wouldOrderAgainShare: null,
  myRating: null,
  partnerRating: null,
});

describe("rankDishes", () => {
  it("ordena pela nota, com os sem nota no fim", () => {
    const ranked = rankDishes([dish("a", null, 0), dish("b", 4, 1), dish("c", 4.5, 1)]);
    expect(ranked.map((item) => item.score)).toEqual([4.5, 4, null]);
  });

  it("no empate, quem tem mais notas vem antes", () => {
    const ranked = rankDishes([dish("a", 4, 1), dish("b", 4, 3)]);
    expect(ranked.map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("não altera a lista original", () => {
    const original = [dish("a", 3, 1), dish("b", 5, 1)];
    rankDishes(original);
    expect(original.map((item) => item.id)).toEqual(["a", "b"]);
  });
});

describe("thumbPathOf", () => {
  it("põe .thumb antes da extensão", () => {
    expect(thumbPathOf("restaurants/a/b.webp")).toBe("restaurants/a/b.thumb.webp");
  });
});

describe("cuisineLabel", () => {
  it("traduz cozinhas conhecidas", () => {
    expect(cuisineLabel("japanese")).toBe("Japonesa");
  });

  it("devolve a própria chave quando não conhece", () => {
    expect(cuisineLabel("desconhecida")).toBe("desconhecida");
  });
});

describe("schemas de edição parcial", () => {
  it("não preenchem padrões nos campos que não vieram", async () => {
    const { restaurantPatchSchema, visitPatchSchema, dishPatchSchema } = await import("./index");
    expect(restaurantPatchSchema.parse({ phone: "11 1234-5678" })).toEqual({ phone: "11 1234-5678" });
    expect(visitPatchSchema.parse({ occasion: "almoço" })).toEqual({ occasion: "almoço" });
    expect(dishPatchSchema.parse({ priceCents: 1000 })).toEqual({ priceCents: 1000 });
  });
});
