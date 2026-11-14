CREATE TABLE "couple_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_user" uuid NOT NULL,
	"to_user" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone,
	CONSTRAINT "couple_invites_status" CHECK ("couple_invites"."status" in ('pending', 'accepted', 'declined', 'cancelled')),
	CONSTRAINT "couple_invites_not_self" CHECK ("couple_invites"."from_user" <> "couple_invites"."to_user")
);
--> statement-breakpoint
ALTER TABLE "couple_invites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "couple_members" (
	"couple_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "couple_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "watch_logs" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "couple_invites" ADD CONSTRAINT "couple_invites_from_user_users_id_fk" FOREIGN KEY ("from_user") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "couple_invites" ADD CONSTRAINT "couple_invites_to_user_users_id_fk" FOREIGN KEY ("to_user") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "couple_members" ADD CONSTRAINT "couple_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "couple_invites_to_idx" ON "couple_invites" USING btree ("to_user","status");--> statement-breakpoint
CREATE INDEX "couple_invites_from_idx" ON "couple_invites" USING btree ("from_user","status");--> statement-breakpoint
CREATE UNIQUE INDEX "couple_invites_pending_pair_key" ON "couple_invites" USING btree ("from_user","to_user") WHERE "couple_invites"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "couple_members_user_key" ON "couple_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "couple_members_couple_idx" ON "couple_members" USING btree ("couple_id");--> statement-breakpoint
CREATE INDEX "watch_logs_group_idx" ON "watch_logs" USING btree ("group_id");--> statement-breakpoint
CREATE POLICY "couple_invites_select_involved" ON "couple_invites" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("couple_invites"."from_user" = (select auth.uid()) or "couple_invites"."to_user" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "couple_members_select_own_couple" ON "couple_members" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("couple_members"."user_id" = (select auth.uid()) or "couple_members"."user_id" = public.partner_of((select auth.uid())));--> statement-breakpoint
ALTER POLICY "dish_ratings_select_visible" ON "dish_ratings" TO authenticated USING ("dish_ratings"."user_id" = (select auth.uid()) or not "dish_ratings"."is_private" or "dish_ratings"."user_id" = public.partner_of((select auth.uid())));--> statement-breakpoint
ALTER POLICY "restaurant_ratings_select_visible" ON "restaurant_ratings" TO authenticated USING ("restaurant_ratings"."user_id" = (select auth.uid()) or not "restaurant_ratings"."is_private" or "restaurant_ratings"."user_id" = public.partner_of((select auth.uid())));--> statement-breakpoint
ALTER POLICY "restaurant_wishlist_select_own" ON "restaurant_wishlist" TO authenticated USING ("restaurant_wishlist"."user_id" = (select auth.uid()) or "restaurant_wishlist"."user_id" = public.partner_of((select auth.uid())));--> statement-breakpoint
ALTER POLICY "restaurant_wishlist_delete_own" ON "restaurant_wishlist" TO authenticated USING ("restaurant_wishlist"."user_id" = (select auth.uid()) or "restaurant_wishlist"."user_id" = public.partner_of((select auth.uid())));--> statement-breakpoint
ALTER POLICY "visit_dishes_select_own" ON "visit_dishes" TO authenticated USING (exists (select 1 from public.visits v where v.id = "visit_dishes"."visit_id"));--> statement-breakpoint
ALTER POLICY "visit_dishes_insert_own" ON "visit_dishes" TO authenticated WITH CHECK (exists (select 1 from public.visits v where v.id = "visit_dishes"."visit_id"));--> statement-breakpoint
ALTER POLICY "visit_dishes_delete_own" ON "visit_dishes" TO authenticated USING (exists (select 1 from public.visits v where v.id = "visit_dishes"."visit_id"));--> statement-breakpoint
ALTER POLICY "visit_photos_select_own" ON "visit_photos" TO authenticated USING (exists (select 1 from public.visits v where v.id = "visit_photos"."visit_id"));--> statement-breakpoint
ALTER POLICY "visit_photos_insert_own" ON "visit_photos" TO authenticated WITH CHECK ("visit_photos"."owner_id" = (select auth.uid()) and exists (select 1 from public.visits v where v.id = "visit_photos"."visit_id"));--> statement-breakpoint
ALTER POLICY "visit_photos_delete_own" ON "visit_photos" TO authenticated USING (exists (select 1 from public.visits v where v.id = "visit_photos"."visit_id"));--> statement-breakpoint
ALTER POLICY "visits_select_own" ON "visits" TO authenticated USING ("visits"."user_id" = (select auth.uid()) or ("visits"."together" and "visits"."user_id" = public.partner_of((select auth.uid()))));--> statement-breakpoint
ALTER POLICY "visits_update_own" ON "visits" TO authenticated USING ("visits"."user_id" = (select auth.uid()) or ("visits"."together" and "visits"."user_id" = public.partner_of((select auth.uid())))) WITH CHECK ("visits"."user_id" = (select auth.uid()) or "visits"."user_id" = public.partner_of((select auth.uid())));--> statement-breakpoint
ALTER POLICY "custom_lists_select_visible" ON "custom_lists" TO authenticated USING ("custom_lists"."owner_id" = (select auth.uid()) or not "custom_lists"."is_private" or "custom_lists"."owner_id" = public.partner_of((select auth.uid())));--> statement-breakpoint
ALTER POLICY "list_items_select_visible" ON "list_items" TO authenticated USING (exists (select 1 from public.custom_lists l where l.id = "list_items"."list_id" and (l.owner_id = (select auth.uid()) or not l.is_private or l.owner_id = public.partner_of((select auth.uid())))));--> statement-breakpoint
ALTER POLICY "watchlist_select_own" ON "watchlist" TO authenticated USING ("watchlist"."user_id" = (select auth.uid()) or "watchlist"."user_id" = public.partner_of((select auth.uid())));--> statement-breakpoint
ALTER POLICY "watchlist_delete_own" ON "watchlist" TO authenticated USING ("watchlist"."user_id" = (select auth.uid()) or "watchlist"."user_id" = public.partner_of((select auth.uid())));--> statement-breakpoint
ALTER POLICY "season_ratings_select_visible" ON "season_ratings" TO authenticated USING ("season_ratings"."user_id" = (select auth.uid()) or not "season_ratings"."is_private" or "season_ratings"."user_id" = public.partner_of((select auth.uid())));--> statement-breakpoint
ALTER POLICY "title_ratings_select_visible" ON "title_ratings" TO authenticated USING ("title_ratings"."user_id" = (select auth.uid()) or not "title_ratings"."is_private" or "title_ratings"."user_id" = public.partner_of((select auth.uid())));--> statement-breakpoint
ALTER POLICY "watch_logs_select_visible" ON "watch_logs" TO authenticated USING ("watch_logs"."user_id" = (select auth.uid()) or not "watch_logs"."is_private" or "watch_logs"."user_id" = public.partner_of((select auth.uid())));