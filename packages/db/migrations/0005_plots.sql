CREATE TABLE "custom_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "custom_lists_name_length" CHECK (char_length("custom_lists"."name") between 1 and 60)
);
--> statement-breakpoint
ALTER TABLE "custom_lists" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "favorite_titles" (
	"user_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"title_id" uuid NOT NULL,
	CONSTRAINT "favorite_titles_user_id_position_pk" PRIMARY KEY("user_id","position"),
	CONSTRAINT "favorite_titles_position" CHECK ("favorite_titles"."position" between 1 and 4)
);
--> statement-breakpoint
ALTER TABLE "favorite_titles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "list_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"title_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "list_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "watchlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title_id" uuid NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "watchlist" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "season_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title_id" uuid NOT NULL,
	"season_number" smallint NOT NULL,
	"rating" numeric(2, 1) NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "season_ratings_rating" CHECK ("season_ratings"."rating" between 0.5 and 5 and "season_ratings"."rating" * 2 = floor("season_ratings"."rating" * 2))
);
--> statement-breakpoint
ALTER TABLE "season_ratings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "seasons" (
	"title_id" uuid NOT NULL,
	"number" smallint NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"episode_count" smallint,
	"year" smallint,
	"poster_path" text,
	CONSTRAINT "seasons_title_id_number_pk" PRIMARY KEY("title_id","number")
);
--> statement-breakpoint
ALTER TABLE "seasons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "title_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title_id" uuid NOT NULL,
	"rating" numeric(2, 1),
	"liked" boolean DEFAULT false NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "title_ratings_rating" CHECK ("title_ratings"."rating" between 0.5 and 5 and "title_ratings"."rating" * 2 = floor("title_ratings"."rating" * 2))
);
--> statement-breakpoint
ALTER TABLE "title_ratings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "titles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tmdb_type" text NOT NULL,
	"tmdb_id" integer NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"original_title" text DEFAULT '' NOT NULL,
	"year" smallint,
	"runtime" smallint,
	"overview" text DEFAULT '' NOT NULL,
	"poster_path" text,
	"backdrop_path" text,
	"genres" text[] DEFAULT '{}'::text[] NOT NULL,
	"credits" jsonb DEFAULT '{"directors":[],"cast":[]}'::jsonb NOT NULL,
	"season_count" smallint,
	"providers" jsonb,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "titles_tmdb_type" CHECK ("titles"."tmdb_type" in ('movie', 'tv')),
	CONSTRAINT "titles_kind" CHECK ("titles"."kind" in ('filme', 'serie', 'documentario', 'anime', 'especial'))
);
--> statement-breakpoint
ALTER TABLE "titles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "watch_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title_id" uuid NOT NULL,
	"season_number" smallint,
	"watched_on" date NOT NULL,
	"rating" numeric(2, 1),
	"review" text DEFAULT '' NOT NULL,
	"liked" boolean DEFAULT false NOT NULL,
	"rewatch" boolean DEFAULT false NOT NULL,
	"together" boolean DEFAULT false NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "watch_logs_rating" CHECK ("watch_logs"."rating" between 0.5 and 5 and "watch_logs"."rating" * 2 = floor("watch_logs"."rating" * 2))
);
--> statement-breakpoint
ALTER TABLE "watch_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "custom_lists" ADD CONSTRAINT "custom_lists_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_titles" ADD CONSTRAINT "favorite_titles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_titles" ADD CONSTRAINT "favorite_titles_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_list_id_custom_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."custom_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_ratings" ADD CONSTRAINT "season_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_ratings" ADD CONSTRAINT "season_ratings_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "title_ratings" ADD CONSTRAINT "title_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "title_ratings" ADD CONSTRAINT "title_ratings_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_logs" ADD CONSTRAINT "watch_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_logs" ADD CONSTRAINT "watch_logs_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "custom_lists_owner_idx" ON "custom_lists" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "favorite_titles_user_title_key" ON "favorite_titles" USING btree ("user_id","title_id");--> statement-breakpoint
CREATE UNIQUE INDEX "list_items_list_title_key" ON "list_items" USING btree ("list_id","title_id");--> statement-breakpoint
CREATE INDEX "list_items_list_position_idx" ON "list_items" USING btree ("list_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "watchlist_user_title_key" ON "watchlist" USING btree ("user_id","title_id");--> statement-breakpoint
CREATE UNIQUE INDEX "season_ratings_user_title_season_key" ON "season_ratings" USING btree ("user_id","title_id","season_number");--> statement-breakpoint
CREATE UNIQUE INDEX "title_ratings_user_title_key" ON "title_ratings" USING btree ("user_id","title_id");--> statement-breakpoint
CREATE UNIQUE INDEX "titles_tmdb_key" ON "titles" USING btree ("tmdb_type","tmdb_id");--> statement-breakpoint
CREATE INDEX "titles_fetched_at_idx" ON "titles" USING btree ("fetched_at");--> statement-breakpoint
CREATE INDEX "watch_logs_user_date_idx" ON "watch_logs" USING btree ("user_id","watched_on" DESC NULLS LAST,"created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "watch_logs_title_idx" ON "watch_logs" USING btree ("title_id");--> statement-breakpoint
CREATE POLICY "custom_lists_select_visible" ON "custom_lists" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("custom_lists"."owner_id" = (select auth.uid()) or not "custom_lists"."is_private");--> statement-breakpoint
CREATE POLICY "custom_lists_insert_own" ON "custom_lists" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("custom_lists"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "custom_lists_update_own" ON "custom_lists" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("custom_lists"."owner_id" = (select auth.uid())) WITH CHECK ("custom_lists"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "custom_lists_delete_own" ON "custom_lists" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("custom_lists"."owner_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "favorite_titles_select_authenticated" ON "favorite_titles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "favorite_titles_insert_own" ON "favorite_titles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("favorite_titles"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "favorite_titles_delete_own" ON "favorite_titles" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("favorite_titles"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "list_items_select_visible" ON "list_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.custom_lists l where l.id = "list_items"."list_id" and (l.owner_id = (select auth.uid()) or not l.is_private)));--> statement-breakpoint
CREATE POLICY "list_items_insert_own" ON "list_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (exists (select 1 from public.custom_lists l where l.id = "list_items"."list_id" and l.owner_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "list_items_update_own" ON "list_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (exists (select 1 from public.custom_lists l where l.id = "list_items"."list_id" and l.owner_id = (select auth.uid()))) WITH CHECK (exists (select 1 from public.custom_lists l where l.id = "list_items"."list_id" and l.owner_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "list_items_delete_own" ON "list_items" AS PERMISSIVE FOR DELETE TO "authenticated" USING (exists (select 1 from public.custom_lists l where l.id = "list_items"."list_id" and l.owner_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "watchlist_select_own" ON "watchlist" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("watchlist"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "watchlist_insert_own" ON "watchlist" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("watchlist"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "watchlist_update_own" ON "watchlist" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("watchlist"."user_id" = (select auth.uid())) WITH CHECK ("watchlist"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "watchlist_delete_own" ON "watchlist" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("watchlist"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "season_ratings_select_visible" ON "season_ratings" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("season_ratings"."user_id" = (select auth.uid()) or not "season_ratings"."is_private");--> statement-breakpoint
CREATE POLICY "season_ratings_insert_own" ON "season_ratings" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("season_ratings"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "season_ratings_update_own" ON "season_ratings" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("season_ratings"."user_id" = (select auth.uid())) WITH CHECK ("season_ratings"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "season_ratings_delete_own" ON "season_ratings" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("season_ratings"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "seasons_select_authenticated" ON "seasons" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "title_ratings_select_visible" ON "title_ratings" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("title_ratings"."user_id" = (select auth.uid()) or not "title_ratings"."is_private");--> statement-breakpoint
CREATE POLICY "title_ratings_insert_own" ON "title_ratings" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("title_ratings"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "title_ratings_update_own" ON "title_ratings" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("title_ratings"."user_id" = (select auth.uid())) WITH CHECK ("title_ratings"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "title_ratings_delete_own" ON "title_ratings" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("title_ratings"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "titles_select_authenticated" ON "titles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "watch_logs_select_visible" ON "watch_logs" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("watch_logs"."user_id" = (select auth.uid()) or not "watch_logs"."is_private");--> statement-breakpoint
CREATE POLICY "watch_logs_insert_own" ON "watch_logs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("watch_logs"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "watch_logs_update_own" ON "watch_logs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("watch_logs"."user_id" = (select auth.uid())) WITH CHECK ("watch_logs"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "watch_logs_delete_own" ON "watch_logs" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("watch_logs"."user_id" = (select auth.uid()));