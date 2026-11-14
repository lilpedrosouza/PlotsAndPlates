import {
  type DishRatingRow,
  type DishRow,
  type Restaurant,
  type RestaurantRatingRow,
  type Tx,
  type WishlistRow,
  dishRatings,
  dishes,
  restaurantPhotos,
  restaurantRatings,
  restaurantWishlist,
  restaurants,
  visitDishes,
  visitPhotos,
  visits,
} from "@pap/db";
import {
  type Dish,
  type DishRating,
  type DishWithScore,
  type MapPin,
  type Page,
  type Photo,
  type PriceLevel,
  type RestaurantDetail,
  type RestaurantListFilters,
  type RestaurantRating,
  type RestaurantSummary,
  type Visit,
  type WishlistPriority,
  mean,
  rankDishes,
  thumbPathOf,
} from "@pap/shared";
import { type SQL, and, asc, desc, eq, ilike, inArray, isNotNull, or, sql } from "drizzle-orm";
import type { MediaStorage } from "../storage";
import { decodeCursor, encodeCursor } from "./cursor";

/** Quem está vendo, a transação (com RLS) e o Storage para montar URLs. */
export type PlatesContext = { tx: Tx; userId: string; storage: MediaStorage };

const toNumber = (value: string | null | undefined) => (value === null || value === undefined ? null : Number(value));

export function photoOf(storage: MediaStorage, id: string, path: string): Photo {
  return { id, path, url: storage.publicUrl(path), thumbUrl: storage.publicUrl(thumbPathOf(path)) };
}

/**
 * De quem são as notas que entram no "score" dos pratos. Na fase 2, só as de
 * quem está vendo; na fase 4 entra o par (e a comunidade tem a seção dela).
 */
function ratersFor(ctx: PlatesContext): string[] {
  return [ctx.userId];
}

function baseQuery(ctx: PlatesContext) {
  const { tx, userId } = ctx;
  const myVisits = tx
    .select({
      restaurantId: visits.restaurantId,
      visitCount: sql<number>`count(*)::int`.as("visit_count"),
      lastVisitOn: sql<string | null>`max(${visits.visitedOn})::text`.as("last_visit_on"),
    })
    .from(visits)
    .where(eq(visits.userId, userId))
    .groupBy(visits.restaurantId)
    .as("my_visits");

  const coverPath = sql<string | null>`coalesce(${restaurants.coverPath}, (
    select p.path from public.restaurant_photos p
    where p.restaurant_id = ${restaurants.id}
    order by p.position, p.created_at limit 1))`;

  const query = tx
    .select({
      restaurant: restaurants,
      visitCount: myVisits.visitCount,
      lastVisitOn: myVisits.lastVisitOn,
      visited: myVisits.restaurantId,
      rating: restaurantRatings,
      wishlist: restaurantWishlist,
      coverPath,
    })
    .from(restaurants)
    .leftJoin(myVisits, eq(myVisits.restaurantId, restaurants.id))
    .leftJoin(
      restaurantRatings,
      and(eq(restaurantRatings.restaurantId, restaurants.id), eq(restaurantRatings.userId, userId)),
    )
    .leftJoin(
      restaurantWishlist,
      and(eq(restaurantWishlist.restaurantId, restaurants.id), eq(restaurantWishlist.userId, userId)),
    );

  return { query, myVisits };
}

type BaseRow = {
  restaurant: Restaurant;
  visitCount: number | null;
  lastVisitOn: string | null;
  rating: RestaurantRatingRow | null;
  wishlist: WishlistRow | null;
  coverPath: string | null;
};

function toSummary(row: BaseRow, storage: MediaStorage): RestaurantSummary {
  const { restaurant } = row;
  return {
    id: restaurant.id,
    name: restaurant.name,
    neighborhood: restaurant.neighborhood,
    city: restaurant.city,
    cuisines: restaurant.cuisines,
    priceLevel: (restaurant.priceLevel as PriceLevel | null) ?? null,
    coverUrl: row.coverPath ? storage.publicUrl(row.coverPath) : null,
    coverThumbUrl: row.coverPath ? storage.publicUrl(thumbPathOf(row.coverPath)) : null,
    lat: restaurant.lat,
    lng: restaurant.lng,
    myOverall: toNumber(row.rating?.overall),
    visitCount: row.visitCount ?? 0,
    lastVisitOn: row.lastVisitOn,
    wishlist: row.wishlist
      ? {
          priority: row.wishlist.priority as WishlistPriority,
          reason: row.wishlist.reason,
          createdAt: row.wishlist.createdAt.toISOString(),
        }
      : null,
  };
}

function toRating(row: RestaurantRatingRow): RestaurantRating {
  return {
    food: toNumber(row.food),
    service: toNumber(row.service),
    ambiance: toNumber(row.ambiance),
    value: toNumber(row.value),
    overall: toNumber(row.overall),
    review: row.review,
    isPrivate: row.isPrivate,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toDishRating(row: DishRatingRow): DishRating {
  return {
    rating: Number(row.rating),
    comment: row.comment,
    wouldOrderAgain: row.wouldOrderAgain,
    isPrivate: row.isPrivate,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toDish(row: DishRow, storage: MediaStorage, canEdit: boolean): Dish {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    name: row.name,
    description: row.description,
    priceCents: row.priceCents,
    category: row.category as Dish["category"],
    photo: row.photoPath ? photoOf(storage, `dish:${row.id}`, row.photoPath) : null,
    canEdit,
  };
}

const PRIORITY_ORDER = sql`case ${restaurantWishlist.priority} when 'alta' then 0 when 'media' then 1 when 'baixa' then 2 else 3 end`;

/** Caderno: restaurantes com visita ou "quero ir" de quem está vendo, com filtros. */
export async function listSummaries(
  ctx: PlatesContext,
  filters: RestaurantListFilters,
): Promise<Page<RestaurantSummary>> {
  const { query, myVisits } = baseQuery(ctx);
  const conditions: SQL[] = [];

  const visited = isNotNull(myVisits.restaurantId);
  const wanted = isNotNull(restaurantWishlist.id);
  if (filters.status === "fomos") conditions.push(visited);
  else if (filters.status === "quero-ir") conditions.push(wanted);
  else conditions.push(or(visited, wanted)!);

  if (filters.cuisine) conditions.push(sql`${restaurants.cuisines} @> array[${filters.cuisine}]::text[]`);
  if (filters.area) {
    const pattern = `${filters.area.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
    conditions.push(or(ilike(restaurants.neighborhood, pattern), ilike(restaurants.city, pattern))!);
  }
  if (filters.price !== undefined) conditions.push(eq(restaurants.priceLevel, filters.price));
  if (filters.minRating !== undefined) conditions.push(sql`${restaurantRatings.overall} >= ${filters.minRating}`);

  const order: SQL[] = {
    recentes: [
      sql`coalesce(${myVisits.lastVisitOn}, (${restaurantWishlist.createdAt})::date::text) desc nulls last`,
      desc(restaurants.createdAt),
    ],
    nota: [sql`${restaurantRatings.overall} desc nulls last`, sql`lower(${restaurants.name})`],
    nome: [sql`lower(${restaurants.name})`],
    prioridade: [PRIORITY_ORDER, desc(restaurantWishlist.createdAt)],
  }[filters.sort];

  const offset = decodeCursor(filters.cursor);
  const rows = await query
    .where(and(...conditions))
    .orderBy(...order, asc(restaurants.id))
    .limit(filters.limit + 1)
    .offset(offset);

  const hasMore = rows.length > filters.limit;
  return {
    items: rows.slice(0, filters.limit).map((row) => toSummary(row, ctx.storage)),
    nextCursor: hasMore ? encodeCursor(offset + filters.limit) : null,
  };
}

/** Pins do mapa: os mesmos restaurantes do caderno, só os que têm posição. */
export async function listPins(ctx: PlatesContext): Promise<MapPin[]> {
  const { query, myVisits } = baseQuery(ctx);
  const rows = await query
    .where(
      and(
        or(isNotNull(myVisits.restaurantId), isNotNull(restaurantWishlist.id)),
        isNotNull(restaurants.lat),
        isNotNull(restaurants.lng),
      ),
    )
    .orderBy(asc(restaurants.id))
    .limit(2000);
  return rows.map((row) => ({
    id: row.restaurant.id,
    name: row.restaurant.name,
    lat: row.restaurant.lat!,
    lng: row.restaurant.lng!,
    status: row.visited ? "fomos" : "quero-ir",
    myOverall: toNumber(row.rating?.overall),
  }));
}

export async function canEditRestaurant(tx: Tx, restaurantId: string): Promise<boolean> {
  const [row] = await tx
    .select({ allowed: sql<boolean>`public.can_edit_restaurant(${restaurantId}::uuid)` })
    .from(sql`(select 1) as one`);
  return row?.allowed === true;
}

export async function restaurantExists(tx: Tx, restaurantId: string): Promise<boolean> {
  const [row] = await tx.select({ id: restaurants.id }).from(restaurants).where(eq(restaurants.id, restaurantId));
  return row !== undefined;
}

/** Pratos do restaurante com a nota de quem está vendo (e, na fase 4, do par). */
export async function loadDishes(ctx: PlatesContext, restaurantId: string, canEdit: boolean): Promise<DishWithScore[]> {
  const rows = await ctx.tx.select().from(dishes).where(eq(dishes.restaurantId, restaurantId));
  if (rows.length === 0) return [];
  const ratings = await ctx.tx
    .select()
    .from(dishRatings)
    .where(and(inArray(dishRatings.dishId, rows.map((row) => row.id)), inArray(dishRatings.userId, ratersFor(ctx))));

  const byDish = new Map<string, DishRatingRow[]>();
  for (const rating of ratings) byDish.set(rating.dishId, [...(byDish.get(rating.dishId) ?? []), rating]);
  return rankDishes(
    rows.map((row) => {
      const mine = byDish.get(row.id) ?? [];
      const answered = mine.filter((rating) => rating.wouldOrderAgain !== null);
      const own = mine.find((rating) => rating.userId === ctx.userId);
      return {
        ...toDish(row, ctx.storage, canEdit),
        score: mean(mine.map((rating) => Number(rating.rating))),
        ratingCount: mine.length,
        wouldOrderAgainShare:
          answered.length > 0 ? answered.filter((rating) => rating.wouldOrderAgain).length / answered.length : null,
        myRating: own ? toDishRating(own) : null,
      };
    }),
  );
}

/** Visitas de quem está vendo neste restaurante, mais recentes primeiro. */
export async function loadVisits(ctx: PlatesContext, restaurantId: string, visitIds?: string[]): Promise<Visit[]> {
  const conditions = [eq(visits.restaurantId, restaurantId), eq(visits.userId, ctx.userId)];
  if (visitIds) conditions.push(inArray(visits.id, visitIds));
  const rows = await ctx.tx
    .select()
    .from(visits)
    .where(and(...conditions))
    .orderBy(desc(visits.visitedOn), desc(visits.createdAt));
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const [photos, links] = await Promise.all([
    ctx.tx.select().from(visitPhotos).where(inArray(visitPhotos.visitId, ids)).orderBy(asc(visitPhotos.createdAt)),
    ctx.tx.select().from(visitDishes).where(inArray(visitDishes.visitId, ids)),
  ]);
  return rows.map((row) => ({
    id: row.id,
    restaurantId: row.restaurantId,
    visitedOn: row.visitedOn,
    occasion: row.occasion,
    amountCents: row.amountCents,
    together: row.together,
    photos: photos.filter((photo) => photo.visitId === row.id).map((photo) => photoOf(ctx.storage, photo.id, photo.path)),
    dishIds: links.filter((link) => link.visitId === row.id).map((link) => link.dishId),
  }));
}

/** Página do restaurante. `null` se não existir. */
export async function loadDetail(ctx: PlatesContext, restaurantId: string): Promise<RestaurantDetail | null> {
  const { query } = baseQuery(ctx);
  const [row] = await query.where(eq(restaurants.id, restaurantId)).limit(1);
  if (!row) return null;

  const canEdit = await canEditRestaurant(ctx.tx, restaurantId);
  const [photos, dishList, visitList] = await Promise.all([
    ctx.tx
      .select()
      .from(restaurantPhotos)
      .where(eq(restaurantPhotos.restaurantId, restaurantId))
      .orderBy(asc(restaurantPhotos.position), asc(restaurantPhotos.createdAt)),
    loadDishes(ctx, restaurantId, canEdit),
    loadVisits(ctx, restaurantId),
  ]);

  const { restaurant } = row;
  return {
    ...toSummary(row, ctx.storage),
    address: restaurant.address,
    phone: restaurant.phone,
    website: restaurant.website,
    openingHours: restaurant.openingHours,
    description: restaurant.description,
    googlePlaceId: restaurant.googlePlaceId,
    osmRef: restaurant.osmRef,
    coverPath: restaurant.coverPath,
    canEdit,
    photos: photos.map((photo) => photoOf(ctx.storage, photo.id, photo.path)),
    myRating: row.rating ? toRating(row.rating) : null,
    dishes: dishList,
    visits: visitList,
  };
}

export { toRating };
