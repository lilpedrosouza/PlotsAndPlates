-- Permissões explícitas das tabelas de Plates (projetos novos do Supabase não
-- dão acesso automático). O RLS decide as linhas; aqui só as operações.
-- Visitante sem login (anon) não tem acesso a nada.
REVOKE ALL ON TABLE "restaurants", "restaurant_photos", "visits", "visit_photos", "dishes", "visit_dishes", "dish_ratings", "restaurant_ratings", "restaurant_wishlist" FROM anon;--> statement-breakpoint
REVOKE ALL ON TABLE "restaurants", "restaurant_photos", "visits", "visit_photos", "dishes", "visit_dishes", "dish_ratings", "restaurant_ratings", "restaurant_wishlist" FROM authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "restaurants", "visits", "dishes", "dish_ratings", "restaurant_ratings", "restaurant_wishlist" TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON TABLE "restaurant_photos", "visit_photos", "visit_dishes" TO authenticated;
