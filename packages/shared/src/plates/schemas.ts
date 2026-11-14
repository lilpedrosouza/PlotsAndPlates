import { z } from "zod";
import { mediaPathSchema } from "../profile";
import { RESTAURANT_CRITERIA, isValidRating } from "../ratings";

export const DISH_CATEGORIES = ["entrada", "principal", "sobremesa", "bebida"] as const;
export type DishCategory = (typeof DISH_CATEGORIES)[number];
export const DISH_CATEGORY_LABELS: Record<DishCategory, string> = {
  entrada: "Entrada",
  principal: "Principal",
  sobremesa: "Sobremesa",
  bebida: "Bebida",
};

export const PRICE_LEVELS = [1, 2, 3, 4] as const;
export type PriceLevel = (typeof PRICE_LEVELS)[number];

export const WISHLIST_PRIORITIES = ["alta", "media", "baixa"] as const;
export type WishlistPriority = (typeof WISHLIST_PRIORITIES)[number];
export const WISHLIST_PRIORITY_LABELS: Record<WishlistPriority, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export const RESTAURANT_SORTS = ["recentes", "nota", "nome", "prioridade"] as const;
export type RestaurantSort = (typeof RESTAURANT_SORTS)[number];

export const RESTAURANT_STATUSES = ["fomos", "quero-ir", "todos"] as const;
export type RestaurantStatus = (typeof RESTAURANT_STATUSES)[number];

const OSM_REF = /^(node|way|relation)\/\d+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Data de hoje (AAAA-MM-DD) no fuso de quem está rodando o código. */
export function todayIso(now = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

/**
 * Versão "edição parcial" de um schema de criação: tudo opcional e sem os
 * valores padrão (senão um PATCH com um campo sobrescreveria os outros).
 */
function patchOf<Shape extends z.ZodRawShape>(schema: z.ZodObject<Shape>) {
  const shape = Object.fromEntries(
    Object.entries(schema.shape).map(([key, field]) => [key, field instanceof z.ZodDefault ? field.unwrap() : field]),
  ) as { [Key in keyof Shape]: Shape[Key] extends z.ZodDefault<infer Inner> ? Inner : Shape[Key] };
  return z.object(shape).partial();
}

const text = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) => text(max).default("");

export const ratingSchema = z
  .number()
  .refine(isValidRating, "A nota vai de 0,5 a 5, em meia estrela.");

export const osmRefSchema = z.string().regex(OSM_REF, "Referência do OpenStreetMap inválida.");

export const visitDateSchema = z
  .string()
  .regex(ISO_DATE, "Data inválida.")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Data inválida.")
  .refine((value) => value <= todayIso(), "A visita não pode ser no futuro.");

export const restaurantInputSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome ao restaurante.").max(80),
  address: optionalText(160),
  neighborhood: optionalText(60),
  city: optionalText(60),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  phone: optionalText(30),
  website: z
    .union([z.literal(""), z.url("Site inválido.").max(300)])
    .default(""),
  openingHours: optionalText(300),
  priceLevel: z
    .number()
    .int()
    .refine((value) => (PRICE_LEVELS as readonly number[]).includes(value), "Faixa de preço inválida.")
    .nullable()
    .optional(),
  cuisines: z.array(z.string().trim().min(1).max(40)).max(5, "No máximo 5 cozinhas.").default([]),
  description: optionalText(1000),
  googlePlaceId: z.string().trim().min(1).max(300).nullable().optional(),
  osmRef: osmRefSchema.nullable().optional(),
  coverPath: mediaPathSchema.nullable().optional(),
});
export type RestaurantInput = z.input<typeof restaurantInputSchema>;
export type RestaurantFields = z.output<typeof restaurantInputSchema>;

export const restaurantPatchSchema = patchOf(restaurantInputSchema).refine((value) => Object.keys(value).length > 0, "Nada para atualizar.");
export type RestaurantPatch = z.input<typeof restaurantPatchSchema>;

export const visitInputSchema = z.object({
  visitedOn: visitDateSchema,
  occasion: optionalText(80),
  amountCents: z.number().int().min(0).max(100_000_00).nullable().optional(),
  dishIds: z.array(z.uuid()).max(30).default([]),
  photoPaths: z.array(mediaPathSchema).max(10, "No máximo 10 fotos por visita.").default([]),
});
export type VisitInput = z.input<typeof visitInputSchema>;
export const visitPatchSchema = patchOf(visitInputSchema);
export type VisitPatch = z.input<typeof visitPatchSchema>;

export const dishInputSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome ao prato.").max(80),
  description: optionalText(500),
  priceCents: z.number().int().min(0).max(10_000_00).nullable().optional(),
  category: z.enum(DISH_CATEGORIES).default("principal"),
  photoPath: mediaPathSchema.nullable().optional(),
});
export type DishInput = z.input<typeof dishInputSchema>;
export const dishPatchSchema = patchOf(dishInputSchema);
export type DishPatch = z.input<typeof dishPatchSchema>;

const criterionShape = Object.fromEntries(
  RESTAURANT_CRITERIA.map((key) => [key, ratingSchema.nullable().optional()]),
) as Record<(typeof RESTAURANT_CRITERIA)[number], z.ZodOptional<z.ZodNullable<typeof ratingSchema>>>;

export const restaurantRatingInputSchema = z
  .object({
    ...criterionShape,
    review: optionalText(4000),
    isPrivate: z.boolean().default(false),
  })
  .refine(
    (value) => RESTAURANT_CRITERIA.some((key) => value[key] != null),
    "Dê nota a pelo menos um critério.",
  );
export type RestaurantRatingInput = z.input<typeof restaurantRatingInputSchema>;

export const dishRatingInputSchema = z.object({
  rating: ratingSchema,
  comment: optionalText(1000),
  wouldOrderAgain: z.boolean().nullable().optional(),
  isPrivate: z.boolean().default(false),
});
export type DishRatingInput = z.input<typeof dishRatingInputSchema>;

export const wishlistInputSchema = z.object({
  reason: optionalText(300),
  priority: z.enum(WISHLIST_PRIORITIES).default("media"),
});
export type WishlistInput = z.input<typeof wishlistInputSchema>;

/** Cadastro: o restaurante e para onde ele vai (visita de hoje ou "quero ir"). */
export const createRestaurantSchema = restaurantInputSchema.extend({
  destination: z.enum(["fomos", "quero-ir"]),
  wishlist: wishlistInputSchema.optional(),
  visit: visitInputSchema.partial({ visitedOn: true }).optional(),
});
export type CreateRestaurantInput = z.input<typeof createRestaurantSchema>;

export const addPhotoSchema = z.object({ path: mediaPathSchema });
export type AddPhotoInput = z.input<typeof addPhotoSchema>;

export const fomosInputSchema = z.object({
  visitedOn: visitDateSchema.optional(),
});
export type FomosInput = z.input<typeof fomosInputSchema>;

export const restaurantListQuerySchema = z.object({
  status: z.enum(RESTAURANT_STATUSES).default("todos"),
  cuisine: z.string().trim().min(1).max(40).optional(),
  /** Bairro ou cidade. */
  area: z.string().trim().min(1).max(60).optional(),
  price: z.coerce
    .number()
    .int()
    .refine((value) => (PRICE_LEVELS as readonly number[]).includes(value), "Faixa de preço inválida.")
    .optional(),
  minRating: z.coerce.number().min(0.5).max(5).optional(),
  sort: z.enum(RESTAURANT_SORTS).default("recentes"),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(60).default(24),
});
export type RestaurantListQuery = z.input<typeof restaurantListQuerySchema>;
export type RestaurantListFilters = z.output<typeof restaurantListQuerySchema>;

const LAT_LNG = /^-?\d{1,2}(\.\d+)?,-?\d{1,3}(\.\d+)?$/;

export const autocompleteQuerySchema = z.object({
  q: z.string().trim().min(2, "Digite pelo menos 2 caracteres.").max(100),
  session: z.uuid(),
  near: z.string().regex(LAT_LNG, "Localização inválida.").optional(),
});
export type AutocompleteQuery = z.input<typeof autocompleteQuerySchema>;

const queryText = z.string().trim().min(1).max(100);

export const placeResolveSchema = z.union([
  z.object({ googlePlaceId: z.string().trim().min(1).max(300), query: queryText, session: z.uuid().optional() }),
  z.object({ mapsUrl: z.url("Link inválido.").max(2000) }),
  z.object({ osmRef: osmRefSchema, query: queryText }),
]);
export type PlaceResolveInput = z.input<typeof placeResolveSchema>;

/** "lat,lng" → números. */
export function parseNear(value: string | undefined): { lat: number; lng: number } | undefined {
  if (!value) return undefined;
  const [lat, lng] = value.split(",").map(Number);
  if (lat === undefined || lng === undefined || !Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  return { lat, lng };
}
