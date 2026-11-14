CREATE TABLE "dish_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dish_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"rating" numeric(2, 1) NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"would_order_again" boolean,
	"is_private" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dish_ratings_rating" CHECK ("dish_ratings"."rating" between 0.5 and 5 and "dish_ratings"."rating" * 2 = floor("dish_ratings"."rating" * 2))
);
--> statement-breakpoint
ALTER TABLE "dish_ratings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "dishes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price_cents" integer,
	"category" text DEFAULT 'principal' NOT NULL,
	"photo_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dishes_name_length" CHECK (char_length("dishes"."name") between 1 and 80),
	CONSTRAINT "dishes_category" CHECK ("dishes"."category" in ('entrada', 'principal', 'sobremesa', 'bebida')),
	CONSTRAINT "dishes_price" CHECK ("dishes"."price_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "dishes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "restaurant_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"path" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "restaurant_photos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "restaurant_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"food" numeric(2, 1),
	"service" numeric(2, 1),
	"ambiance" numeric(2, 1),
	"value" numeric(2, 1),
	"overall" numeric(2, 1) GENERATED ALWAYS AS (case when (food is not null)::int + (service is not null)::int + (ambiance is not null)::int + (value is not null)::int = 0 then null else floor((coalesce(food, 0) + coalesce(service, 0) + coalesce(ambiance, 0) + coalesce(value, 0)) / ((food is not null)::int + (service is not null)::int + (ambiance is not null)::int + (value is not null)::int) * 2 + 0.5) / 2 end) STORED,
	"review" text DEFAULT '' NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restaurant_ratings_food" CHECK ("restaurant_ratings"."food" between 0.5 and 5 and "restaurant_ratings"."food" * 2 = floor("restaurant_ratings"."food" * 2)),
	CONSTRAINT "restaurant_ratings_service" CHECK ("restaurant_ratings"."service" between 0.5 and 5 and "restaurant_ratings"."service" * 2 = floor("restaurant_ratings"."service" * 2)),
	CONSTRAINT "restaurant_ratings_ambiance" CHECK ("restaurant_ratings"."ambiance" between 0.5 and 5 and "restaurant_ratings"."ambiance" * 2 = floor("restaurant_ratings"."ambiance" * 2)),
	CONSTRAINT "restaurant_ratings_value" CHECK ("restaurant_ratings"."value" between 0.5 and 5 and "restaurant_ratings"."value" * 2 = floor("restaurant_ratings"."value" * 2)),
	CONSTRAINT "restaurant_ratings_some_criterion" CHECK (coalesce("restaurant_ratings"."food", "restaurant_ratings"."service", "restaurant_ratings"."ambiance", "restaurant_ratings"."value") is not null)
);
--> statement-breakpoint
ALTER TABLE "restaurant_ratings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "restaurant_wishlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"priority" text DEFAULT 'media' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restaurant_wishlist_priority" CHECK ("restaurant_wishlist"."priority" in ('alta', 'media', 'baixa'))
);
--> statement-breakpoint
ALTER TABLE "restaurant_wishlist" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "restaurants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid NOT NULL,
	"google_place_id" text,
	"osm_ref" text,
	"name" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"neighborhood" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"phone" text DEFAULT '' NOT NULL,
	"website" text DEFAULT '' NOT NULL,
	"opening_hours" text DEFAULT '' NOT NULL,
	"price_level" smallint,
	"cuisines" text[] DEFAULT '{}'::text[] NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"cover_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restaurants_name_length" CHECK (char_length("restaurants"."name") between 1 and 80),
	CONSTRAINT "restaurants_price_level" CHECK ("restaurants"."price_level" between 1 and 4),
	CONSTRAINT "restaurants_lat" CHECK ("restaurants"."lat" between -90 and 90),
	CONSTRAINT "restaurants_lng" CHECK ("restaurants"."lng" between -180 and 180)
);
--> statement-breakpoint
ALTER TABLE "restaurants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "visit_dishes" (
	"visit_id" uuid NOT NULL,
	"dish_id" uuid NOT NULL,
	CONSTRAINT "visit_dishes_visit_id_dish_id_pk" PRIMARY KEY("visit_id","dish_id")
);
--> statement-breakpoint
ALTER TABLE "visit_dishes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "visit_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visit_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"path" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "visit_photos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"visited_on" date NOT NULL,
	"occasion" text DEFAULT '' NOT NULL,
	"amount_cents" integer,
	"together" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "visits_amount" CHECK ("visits"."amount_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "visits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dish_ratings" ADD CONSTRAINT "dish_ratings_dish_id_dishes_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."dishes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dish_ratings" ADD CONSTRAINT "dish_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dishes" ADD CONSTRAINT "dishes_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dishes" ADD CONSTRAINT "dishes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_photos" ADD CONSTRAINT "restaurant_photos_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_photos" ADD CONSTRAINT "restaurant_photos_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_ratings" ADD CONSTRAINT "restaurant_ratings_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_ratings" ADD CONSTRAINT "restaurant_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_wishlist" ADD CONSTRAINT "restaurant_wishlist_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_wishlist" ADD CONSTRAINT "restaurant_wishlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_dishes" ADD CONSTRAINT "visit_dishes_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_dishes" ADD CONSTRAINT "visit_dishes_dish_id_dishes_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."dishes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_photos" ADD CONSTRAINT "visit_photos_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_photos" ADD CONSTRAINT "visit_photos_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dish_ratings_dish_user_key" ON "dish_ratings" USING btree ("dish_id","user_id");--> statement-breakpoint
CREATE INDEX "dishes_restaurant_idx" ON "dishes" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "restaurant_photos_restaurant_idx" ON "restaurant_photos" USING btree ("restaurant_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "restaurant_ratings_restaurant_user_key" ON "restaurant_ratings" USING btree ("restaurant_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "restaurant_wishlist_restaurant_user_key" ON "restaurant_wishlist" USING btree ("restaurant_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "restaurants_google_place_id_key" ON "restaurants" USING btree ("google_place_id");--> statement-breakpoint
CREATE UNIQUE INDEX "restaurants_osm_ref_key" ON "restaurants" USING btree ("osm_ref");--> statement-breakpoint
CREATE INDEX "restaurants_city_idx" ON "restaurants" USING btree (lower("city"));--> statement-breakpoint
CREATE INDEX "restaurants_neighborhood_idx" ON "restaurants" USING btree (lower("neighborhood"));--> statement-breakpoint
CREATE INDEX "restaurants_cuisines_idx" ON "restaurants" USING gin ("cuisines");--> statement-breakpoint
CREATE INDEX "visit_dishes_dish_idx" ON "visit_dishes" USING btree ("dish_id");--> statement-breakpoint
CREATE INDEX "visit_photos_visit_idx" ON "visit_photos" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "visits_user_date_idx" ON "visits" USING btree ("user_id","visited_on" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "visits_restaurant_idx" ON "visits" USING btree ("restaurant_id");--> statement-breakpoint
CREATE POLICY "dish_ratings_select_visible" ON "dish_ratings" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("dish_ratings"."user_id" = (select auth.uid()) or not "dish_ratings"."is_private");--> statement-breakpoint
CREATE POLICY "dish_ratings_insert_own" ON "dish_ratings" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("dish_ratings"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "dish_ratings_update_own" ON "dish_ratings" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("dish_ratings"."user_id" = (select auth.uid())) WITH CHECK ("dish_ratings"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "dish_ratings_delete_own" ON "dish_ratings" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("dish_ratings"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "dishes_select_authenticated" ON "dishes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "dishes_insert_editor" ON "dishes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("dishes"."created_by" = (select auth.uid()) and public.can_edit_restaurant("dishes"."restaurant_id"));--> statement-breakpoint
CREATE POLICY "dishes_update_editor" ON "dishes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (public.can_edit_restaurant("dishes"."restaurant_id")) WITH CHECK (public.can_edit_restaurant("dishes"."restaurant_id"));--> statement-breakpoint
CREATE POLICY "dishes_delete_editor" ON "dishes" AS PERMISSIVE FOR DELETE TO "authenticated" USING (public.can_edit_restaurant("dishes"."restaurant_id"));--> statement-breakpoint
CREATE POLICY "restaurant_photos_select_authenticated" ON "restaurant_photos" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "restaurant_photos_insert_editor" ON "restaurant_photos" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("restaurant_photos"."owner_id" = (select auth.uid()) and public.can_edit_restaurant("restaurant_photos"."restaurant_id"));--> statement-breakpoint
CREATE POLICY "restaurant_photos_delete_editor" ON "restaurant_photos" AS PERMISSIVE FOR DELETE TO "authenticated" USING (public.can_edit_restaurant("restaurant_photos"."restaurant_id"));--> statement-breakpoint
CREATE POLICY "restaurant_ratings_select_visible" ON "restaurant_ratings" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("restaurant_ratings"."user_id" = (select auth.uid()) or not "restaurant_ratings"."is_private");--> statement-breakpoint
CREATE POLICY "restaurant_ratings_insert_own" ON "restaurant_ratings" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("restaurant_ratings"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "restaurant_ratings_update_own" ON "restaurant_ratings" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("restaurant_ratings"."user_id" = (select auth.uid())) WITH CHECK ("restaurant_ratings"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "restaurant_ratings_delete_own" ON "restaurant_ratings" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("restaurant_ratings"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "restaurant_wishlist_select_own" ON "restaurant_wishlist" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("restaurant_wishlist"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "restaurant_wishlist_insert_own" ON "restaurant_wishlist" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("restaurant_wishlist"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "restaurant_wishlist_update_own" ON "restaurant_wishlist" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("restaurant_wishlist"."user_id" = (select auth.uid())) WITH CHECK ("restaurant_wishlist"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "restaurant_wishlist_delete_own" ON "restaurant_wishlist" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("restaurant_wishlist"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "restaurants_select_authenticated" ON "restaurants" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "restaurants_insert_own" ON "restaurants" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("restaurants"."created_by" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "restaurants_update_editor" ON "restaurants" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (public.can_edit_restaurant("restaurants"."id")) WITH CHECK (public.can_edit_restaurant("restaurants"."id"));--> statement-breakpoint
CREATE POLICY "restaurants_delete_editor" ON "restaurants" AS PERMISSIVE FOR DELETE TO "authenticated" USING (public.can_edit_restaurant("restaurants"."id"));--> statement-breakpoint
CREATE POLICY "visit_dishes_select_own" ON "visit_dishes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.visits v where v.id = "visit_dishes"."visit_id" and v.user_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "visit_dishes_insert_own" ON "visit_dishes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (exists (select 1 from public.visits v where v.id = "visit_dishes"."visit_id" and v.user_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "visit_dishes_delete_own" ON "visit_dishes" AS PERMISSIVE FOR DELETE TO "authenticated" USING (exists (select 1 from public.visits v where v.id = "visit_dishes"."visit_id" and v.user_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "visit_photos_select_own" ON "visit_photos" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("visit_photos"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "visit_photos_insert_own" ON "visit_photos" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("visit_photos"."owner_id" = (select auth.uid()) and exists (select 1 from public.visits v where v.id = "visit_photos"."visit_id" and v.user_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "visit_photos_delete_own" ON "visit_photos" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("visit_photos"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "visits_select_own" ON "visits" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("visits"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "visits_insert_own" ON "visits" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("visits"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "visits_update_own" ON "visits" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("visits"."user_id" = (select auth.uid())) WITH CHECK ("visits"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "visits_delete_own" ON "visits" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("visits"."user_id" = (select auth.uid()));