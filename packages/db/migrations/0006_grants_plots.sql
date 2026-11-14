-- Permissões explícitas das tabelas de Plots. O catálogo (titles, seasons) é
-- só leitura para quem está logado: quem grava é a API, dona das tabelas.
-- Visitante sem login (anon) não tem acesso a nada.
REVOKE ALL ON TABLE "titles", "seasons", "watch_logs", "title_ratings", "season_ratings", "watchlist", "custom_lists", "list_items", "favorite_titles" FROM anon;--> statement-breakpoint
REVOKE ALL ON TABLE "titles", "seasons", "watch_logs", "title_ratings", "season_ratings", "watchlist", "custom_lists", "list_items", "favorite_titles" FROM authenticated;--> statement-breakpoint
GRANT SELECT ON TABLE "titles", "seasons" TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "watch_logs", "title_ratings", "season_ratings", "watchlist", "custom_lists", "list_items" TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON TABLE "favorite_titles" TO authenticated;
