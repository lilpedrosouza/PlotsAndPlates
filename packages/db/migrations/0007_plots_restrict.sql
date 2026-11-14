ALTER TABLE "favorite_titles" DROP CONSTRAINT "favorite_titles_title_id_titles_id_fk";
--> statement-breakpoint
ALTER TABLE "list_items" DROP CONSTRAINT "list_items_title_id_titles_id_fk";
--> statement-breakpoint
ALTER TABLE "watchlist" DROP CONSTRAINT "watchlist_title_id_titles_id_fk";
--> statement-breakpoint
ALTER TABLE "season_ratings" DROP CONSTRAINT "season_ratings_title_id_titles_id_fk";
--> statement-breakpoint
ALTER TABLE "title_ratings" DROP CONSTRAINT "title_ratings_title_id_titles_id_fk";
--> statement-breakpoint
ALTER TABLE "watch_logs" DROP CONSTRAINT "watch_logs_title_id_titles_id_fk";
--> statement-breakpoint
ALTER TABLE "favorite_titles" ADD CONSTRAINT "favorite_titles_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_ratings" ADD CONSTRAINT "season_ratings_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "title_ratings" ADD CONSTRAINT "title_ratings_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_logs" ADD CONSTRAINT "watch_logs_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE restrict ON UPDATE no action;