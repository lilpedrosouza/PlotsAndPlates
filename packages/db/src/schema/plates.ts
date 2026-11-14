import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  numeric,
  pgPolicy,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authUid, authUsers, authenticatedRole } from "drizzle-orm/supabase";

/**
 * Plates: restaurantes (registro único, compartilhado por todos), visitas,
 * pratos, avaliações e a lista "quero ir".
 *
 * Quem pode editar um restaurante, as fotos dele e os pratos é decidido pela
 * função `public.can_edit_restaurant(id)` (migration 0002): na fase 2, quem
 * cadastrou; na fase 4, também o par dessa pessoa.
 */

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
const userRef = (name: string) =>
  uuid(name)
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" });
const rating = (name: string) => numeric(name, { precision: 2, scale: 1 });
/** Nota de 0,5 a 5, em meia estrela. */
const ratingCheck = (column: AnyPgColumn) => sql`${column} between 0.5 and 5 and ${column} * 2 = floor(${column} * 2)`;

const canEdit = (restaurantId: AnyPgColumn) => sql`public.can_edit_restaurant(${restaurantId})`;
const isMine = (column: AnyPgColumn) => sql`${column} = ${authUid}`;

export const restaurants = pgTable(
  "restaurants",
  {
    id: id(),
    createdBy: userRef("created_by"),
    /** Único dado do Google guardado (permitido pelos termos). */
    googlePlaceId: text("google_place_id"),
    /** Ex.: `node/123` no OpenStreetMap. */
    osmRef: text("osm_ref"),
    name: text("name").notNull(),
    address: text("address").notNull().default(""),
    neighborhood: text("neighborhood").notNull().default(""),
    city: text("city").notNull().default(""),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    phone: text("phone").notNull().default(""),
    website: text("website").notNull().default(""),
    openingHours: text("opening_hours").notNull().default(""),
    priceLevel: smallint("price_level"),
    cuisines: text("cuisines")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    description: text("description").notNull().default(""),
    coverPath: text("cover_path"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("restaurants_google_place_id_key").on(table.googlePlaceId),
    uniqueIndex("restaurants_osm_ref_key").on(table.osmRef),
    index("restaurants_city_idx").on(sql`lower(${table.city})`),
    index("restaurants_neighborhood_idx").on(sql`lower(${table.neighborhood})`),
    index("restaurants_cuisines_idx").using("gin", table.cuisines),
    check("restaurants_name_length", sql`char_length(${table.name}) between 1 and 80`),
    check("restaurants_price_level", sql`${table.priceLevel} between 1 and 4`),
    check("restaurants_lat", sql`${table.lat} between -90 and 90`),
    check("restaurants_lng", sql`${table.lng} between -180 and 180`),
    pgPolicy("restaurants_select_authenticated", { for: "select", to: authenticatedRole, using: sql`true` }),
    pgPolicy("restaurants_insert_own", { for: "insert", to: authenticatedRole, withCheck: isMine(table.createdBy) }),
    pgPolicy("restaurants_update_editor", {
      for: "update",
      to: authenticatedRole,
      using: canEdit(table.id),
      withCheck: canEdit(table.id),
    }),
    pgPolicy("restaurants_delete_editor", { for: "delete", to: authenticatedRole, using: canEdit(table.id) }),
  ],
);

export const restaurantPhotos = pgTable(
  "restaurant_photos",
  {
    id: id(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    ownerId: userRef("owner_id"),
    path: text("path").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (table) => [
    index("restaurant_photos_restaurant_idx").on(table.restaurantId, table.position),
    pgPolicy("restaurant_photos_select_authenticated", { for: "select", to: authenticatedRole, using: sql`true` }),
    pgPolicy("restaurant_photos_insert_editor", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${isMine(table.ownerId)} and ${canEdit(table.restaurantId)}`,
    }),
    pgPolicy("restaurant_photos_delete_editor", {
      for: "delete",
      to: authenticatedRole,
      using: canEdit(table.restaurantId),
    }),
  ],
);

export const visits = pgTable(
  "visits",
  {
    id: id(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    userId: userRef("user_id"),
    visitedOn: date("visited_on", { mode: "string" }).notNull(),
    occasion: text("occasion").notNull().default(""),
    amountCents: integer("amount_cents"),
    /** "Juntos": só passa a valer com o vínculo de casal (fase 4). */
    together: boolean("together").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("visits_user_date_idx").on(table.userId, table.visitedOn.desc()),
    index("visits_restaurant_idx").on(table.restaurantId),
    check("visits_amount", sql`${table.amountCents} >= 0`),
    pgPolicy("visits_select_own", { for: "select", to: authenticatedRole, using: isMine(table.userId) }),
    pgPolicy("visits_insert_own", { for: "insert", to: authenticatedRole, withCheck: isMine(table.userId) }),
    pgPolicy("visits_update_own", {
      for: "update",
      to: authenticatedRole,
      using: isMine(table.userId),
      withCheck: isMine(table.userId),
    }),
    pgPolicy("visits_delete_own", { for: "delete", to: authenticatedRole, using: isMine(table.userId) }),
  ],
);

const ownsVisit = (visitId: AnyPgColumn) =>
  sql`exists (select 1 from public.visits v where v.id = ${visitId} and v.user_id = ${authUid})`;

export const visitPhotos = pgTable(
  "visit_photos",
  {
    id: id(),
    visitId: uuid("visit_id")
      .notNull()
      .references(() => visits.id, { onDelete: "cascade" }),
    ownerId: userRef("owner_id"),
    path: text("path").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index("visit_photos_visit_idx").on(table.visitId),
    pgPolicy("visit_photos_select_own", { for: "select", to: authenticatedRole, using: isMine(table.ownerId) }),
    pgPolicy("visit_photos_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${isMine(table.ownerId)} and ${ownsVisit(table.visitId)}`,
    }),
    pgPolicy("visit_photos_delete_own", { for: "delete", to: authenticatedRole, using: isMine(table.ownerId) }),
  ],
);

export const dishes = pgTable(
  "dishes",
  {
    id: id(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    createdBy: userRef("created_by"),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    priceCents: integer("price_cents"),
    category: text("category").notNull().default("principal"),
    photoPath: text("photo_path"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("dishes_restaurant_idx").on(table.restaurantId),
    check("dishes_name_length", sql`char_length(${table.name}) between 1 and 80`),
    check("dishes_category", sql`${table.category} in ('entrada', 'principal', 'sobremesa', 'bebida')`),
    check("dishes_price", sql`${table.priceCents} >= 0`),
    pgPolicy("dishes_select_authenticated", { for: "select", to: authenticatedRole, using: sql`true` }),
    pgPolicy("dishes_insert_editor", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${isMine(table.createdBy)} and ${canEdit(table.restaurantId)}`,
    }),
    pgPolicy("dishes_update_editor", {
      for: "update",
      to: authenticatedRole,
      using: canEdit(table.restaurantId),
      withCheck: canEdit(table.restaurantId),
    }),
    pgPolicy("dishes_delete_editor", { for: "delete", to: authenticatedRole, using: canEdit(table.restaurantId) }),
  ],
);

export const visitDishes = pgTable(
  "visit_dishes",
  {
    visitId: uuid("visit_id")
      .notNull()
      .references(() => visits.id, { onDelete: "cascade" }),
    dishId: uuid("dish_id")
      .notNull()
      .references(() => dishes.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.visitId, table.dishId] }),
    index("visit_dishes_dish_idx").on(table.dishId),
    pgPolicy("visit_dishes_select_own", { for: "select", to: authenticatedRole, using: ownsVisit(table.visitId) }),
    pgPolicy("visit_dishes_insert_own", { for: "insert", to: authenticatedRole, withCheck: ownsVisit(table.visitId) }),
    pgPolicy("visit_dishes_delete_own", { for: "delete", to: authenticatedRole, using: ownsVisit(table.visitId) }),
  ],
);

/** Políticas comuns às avaliações: o dono faz tudo; os outros leem as públicas. */
const ratingPolicies = (prefix: string, userId: AnyPgColumn, isPrivate: AnyPgColumn) => [
  pgPolicy(`${prefix}_select_visible`, {
    for: "select",
    to: authenticatedRole,
    using: sql`${isMine(userId)} or not ${isPrivate}`,
  }),
  pgPolicy(`${prefix}_insert_own`, { for: "insert", to: authenticatedRole, withCheck: isMine(userId) }),
  pgPolicy(`${prefix}_update_own`, {
    for: "update",
    to: authenticatedRole,
    using: isMine(userId),
    withCheck: isMine(userId),
  }),
  pgPolicy(`${prefix}_delete_own`, { for: "delete", to: authenticatedRole, using: isMine(userId) }),
];

export const dishRatings = pgTable(
  "dish_ratings",
  {
    id: id(),
    dishId: uuid("dish_id")
      .notNull()
      .references(() => dishes.id, { onDelete: "cascade" }),
    userId: userRef("user_id"),
    rating: rating("rating").notNull(),
    comment: text("comment").notNull().default(""),
    wouldOrderAgain: boolean("would_order_again"),
    isPrivate: boolean("is_private").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("dish_ratings_dish_user_key").on(table.dishId, table.userId),
    check("dish_ratings_rating", ratingCheck(table.rating)),
    ...ratingPolicies("dish_ratings", table.userId, table.isPrivate),
  ],
);

const CRITERIA_SQL = {
  sum: sql.raw("coalesce(food, 0) + coalesce(service, 0) + coalesce(ambiance, 0) + coalesce(value, 0)"),
  count: sql.raw(
    "(food is not null)::int + (service is not null)::int + (ambiance is not null)::int + (value is not null)::int",
  ),
};

export const restaurantRatings = pgTable(
  "restaurant_ratings",
  {
    id: id(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    userId: userRef("user_id"),
    food: rating("food"),
    service: rating("service"),
    ambiance: rating("ambiance"),
    value: rating("value"),
    /**
     * Nota geral: média dos critérios preenchidos, arredondada para a meia
     * estrela mais próxima, empate para cima (mesma regra de
     * `overallFromCriteria` em @pap/shared).
     */
    overall: rating("overall").generatedAlwaysAs(
      sql`case when ${CRITERIA_SQL.count} = 0 then null else floor((${CRITERIA_SQL.sum}) / (${CRITERIA_SQL.count}) * 2 + 0.5) / 2 end`,
    ),
    review: text("review").notNull().default(""),
    isPrivate: boolean("is_private").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("restaurant_ratings_restaurant_user_key").on(table.restaurantId, table.userId),
    check("restaurant_ratings_food", ratingCheck(table.food)),
    check("restaurant_ratings_service", ratingCheck(table.service)),
    check("restaurant_ratings_ambiance", ratingCheck(table.ambiance)),
    check("restaurant_ratings_value", ratingCheck(table.value)),
    check(
      "restaurant_ratings_some_criterion",
      sql`coalesce(${table.food}, ${table.service}, ${table.ambiance}, ${table.value}) is not null`,
    ),
    ...ratingPolicies("restaurant_ratings", table.userId, table.isPrivate),
  ],
);

export const restaurantWishlist = pgTable(
  "restaurant_wishlist",
  {
    id: id(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    userId: userRef("user_id"),
    reason: text("reason").notNull().default(""),
    priority: text("priority").notNull().default("media"),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("restaurant_wishlist_restaurant_user_key").on(table.restaurantId, table.userId),
    check("restaurant_wishlist_priority", sql`${table.priority} in ('alta', 'media', 'baixa')`),
    pgPolicy("restaurant_wishlist_select_own", { for: "select", to: authenticatedRole, using: isMine(table.userId) }),
    pgPolicy("restaurant_wishlist_insert_own", { for: "insert", to: authenticatedRole, withCheck: isMine(table.userId) }),
    pgPolicy("restaurant_wishlist_update_own", {
      for: "update",
      to: authenticatedRole,
      using: isMine(table.userId),
      withCheck: isMine(table.userId),
    }),
    pgPolicy("restaurant_wishlist_delete_own", { for: "delete", to: authenticatedRole, using: isMine(table.userId) }),
  ],
);

export type Restaurant = typeof restaurants.$inferSelect;
export type NewRestaurant = typeof restaurants.$inferInsert;
export type RestaurantPhoto = typeof restaurantPhotos.$inferSelect;
export type VisitRow = typeof visits.$inferSelect;
export type VisitPhoto = typeof visitPhotos.$inferSelect;
export type DishRow = typeof dishes.$inferSelect;
export type DishRatingRow = typeof dishRatings.$inferSelect;
export type RestaurantRatingRow = typeof restaurantRatings.$inferSelect;
export type WishlistRow = typeof restaurantWishlist.$inferSelect;
