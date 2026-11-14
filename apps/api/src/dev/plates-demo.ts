/**
 * Dados de exemplo de Plates para o modo local e para o seed. Restaurantes
 * fictícios em bairros reais de São Paulo, com visitas, pratos, notas e
 * "quero ir". Gravados direto no banco (sem RLS), só em desenvolvimento.
 */
import {
  type Db,
  dishRatings,
  dishes,
  restaurantRatings,
  restaurantWishlist,
  restaurants,
  visitDishes,
  visits,
} from "@pap/db";
import { and, eq } from "drizzle-orm";

type DemoDish = { name: string; category: string; priceCents: number; rating?: number; again?: boolean };
type DemoRestaurant = {
  name: string;
  neighborhood: string;
  city: string;
  address: string;
  cuisines: string[];
  priceLevel: number;
  lat: number;
  lng: number;
  description: string;
  createdBy: "ana" | "bia";
  /** Dias atrás de cada visita da Ana. */
  anaVisits?: number[];
  anaRating?: { food?: number; service?: number; ambiance?: number; value?: number; review?: string };
  bia?: { daysAgo: number; food: number };
  wishlist?: { priority: "alta" | "media" | "baixa"; reason: string };
  dishes?: DemoDish[];
};

const DEMO: DemoRestaurant[] = [
  {
    name: "Bar do Zé",
    neighborhood: "Pinheiros",
    city: "São Paulo",
    address: "Rua dos Pinheiros, 100",
    cuisines: ["brazilian", "bar"],
    priceLevel: 2,
    lat: -23.5617,
    lng: -46.6912,
    description: "Boteco de esquina com mesa na calçada.",
    createdBy: "ana",
    anaVisits: [3, 40],
    anaRating: { food: 4.5, service: 4, ambiance: 4, value: 5, review: "O bolinho sozinho já vale a ida." },
    bia: { daysAgo: 3, food: 4 },
    dishes: [
      { name: "Bolinho de bacalhau", category: "entrada", priceCents: 3800, rating: 4.5, again: true },
      { name: "Feijoada de sábado", category: "principal", priceCents: 6900, rating: 4, again: true },
      { name: "Pudim de leite", category: "sobremesa", priceCents: 2200, rating: 5, again: true },
    ],
  },
  {
    name: "Cantina Nonna Lina",
    neighborhood: "Bixiga",
    city: "São Paulo",
    address: "Rua Treze de Maio, 230",
    cuisines: ["italian", "pasta"],
    priceLevel: 3,
    lat: -23.5577,
    lng: -46.645,
    description: "Toalha xadrez e porção que serve dois.",
    createdBy: "ana",
    anaVisits: [10],
    anaRating: { food: 4, service: 3.5, ambiance: 4.5, value: 3 },
    dishes: [
      { name: "Fettuccine ao sugo", category: "principal", priceCents: 7400, rating: 4, again: true },
      { name: "Tiramisù", category: "sobremesa", priceCents: 3200, rating: 3.5, again: false },
    ],
  },
  {
    name: "Kaiten Liberdade",
    neighborhood: "Liberdade",
    city: "São Paulo",
    address: "Rua Galvão Bueno, 50",
    cuisines: ["japanese", "sushi"],
    priceLevel: 3,
    lat: -23.5587,
    lng: -46.6348,
    description: "Esteira de sushi; chegar antes das 19h.",
    createdBy: "ana",
    anaVisits: [24],
    anaRating: { food: 5, service: 4.5, ambiance: 4, value: 4, review: "Melhor salmão maçaricado da vida." },
    dishes: [{ name: "Combinado do chef", category: "principal", priceCents: 11900, rating: 5, again: true }],
  },
  {
    name: "Padoca da Esquina",
    neighborhood: "Vila Madalena",
    city: "São Paulo",
    address: "Rua Aspicuelta, 12",
    cuisines: ["bakery", "coffee_shop"],
    priceLevel: 1,
    lat: -23.5536,
    lng: -46.6911,
    description: "",
    createdBy: "ana",
    anaVisits: [55],
    anaRating: { food: 3.5, value: 4.5 },
    dishes: [{ name: "Pão na chapa", category: "entrada", priceCents: 900, rating: 4, again: true }],
  },
  {
    name: "Taqueria El Patio",
    neighborhood: "Moema",
    city: "São Paulo",
    address: "Alameda dos Maracatins, 400",
    cuisines: ["mexican"],
    priceLevel: 2,
    lat: -23.6005,
    lng: -46.663,
    description: "",
    createdBy: "ana",
    wishlist: { priority: "alta", reason: "A Bia jura que o taco al pastor é o melhor de SP." },
  },
  {
    name: "Café Paulista 23",
    neighborhood: "Sé",
    city: "São Paulo",
    address: "Praça da Sé, 23",
    cuisines: ["coffee_shop"],
    priceLevel: 1,
    lat: -23.5475,
    lng: -46.6361,
    description: "",
    createdBy: "bia",
    bia: { daysAgo: 7, food: 3.5 },
    wishlist: { priority: "baixa", reason: "Café da manhã de domingo." },
  },
];

const daysAgo = (days: number) => {
  const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};
const numeric = (value: number | undefined) => (value === undefined ? null : String(value));

/** Grava os exemplos. Idempotente: não faz nada se já existirem. */
export async function seedPlatesDemo(db: Db, users: { ana: string; bia: string }): Promise<void> {
  const [already] = await db
    .select({ id: restaurants.id })
    .from(restaurants)
    .where(and(eq(restaurants.name, DEMO[0]!.name), eq(restaurants.createdBy, users.ana)));
  if (already) return;

  for (const demo of DEMO) {
    const owner = users[demo.createdBy];
    const [restaurant] = await db
      .insert(restaurants)
      .values({
        createdBy: owner,
        name: demo.name,
        neighborhood: demo.neighborhood,
        city: demo.city,
        address: demo.address,
        cuisines: demo.cuisines,
        priceLevel: demo.priceLevel,
        lat: demo.lat,
        lng: demo.lng,
        description: demo.description,
      })
      .returning({ id: restaurants.id });
    if (!restaurant) continue;

    const dishIds: { id: string; demo: DemoDish }[] = [];
    for (const dish of demo.dishes ?? []) {
      const [row] = await db
        .insert(dishes)
        .values({ restaurantId: restaurant.id, createdBy: owner, name: dish.name, category: dish.category, priceCents: dish.priceCents })
        .returning({ id: dishes.id });
      if (row) dishIds.push({ id: row.id, demo: dish });
    }

    for (const [index, days] of (demo.anaVisits ?? []).entries()) {
      const [visit] = await db
        .insert(visits)
        .values({ restaurantId: restaurant.id, userId: users.ana, visitedOn: daysAgo(days), occasion: index === 0 ? "jantar a dois" : "" })
        .returning({ id: visits.id });
      if (visit && dishIds.length > 0) {
        await db.insert(visitDishes).values(dishIds.map((dish) => ({ visitId: visit.id, dishId: dish.id })));
      }
    }

    if (demo.anaRating) {
      const { food, service, ambiance, value, review } = demo.anaRating;
      await db.insert(restaurantRatings).values({
        restaurantId: restaurant.id,
        userId: users.ana,
        food: numeric(food),
        service: numeric(service),
        ambiance: numeric(ambiance),
        value: numeric(value),
        review: review ?? "",
      });
      for (const dish of dishIds) {
        if (dish.demo.rating === undefined) continue;
        await db.insert(dishRatings).values({
          dishId: dish.id,
          userId: users.ana,
          rating: String(dish.demo.rating),
          wouldOrderAgain: dish.demo.again ?? null,
        });
      }
    }

    if (demo.bia) {
      await db.insert(visits).values({ restaurantId: restaurant.id, userId: users.bia, visitedOn: daysAgo(demo.bia.daysAgo) });
      await db.insert(restaurantRatings).values({ restaurantId: restaurant.id, userId: users.bia, food: String(demo.bia.food) });
    }

    if (demo.wishlist) {
      await db.insert(restaurantWishlist).values({ restaurantId: restaurant.id, userId: users.ana, ...demo.wishlist });
    }
  }
}
