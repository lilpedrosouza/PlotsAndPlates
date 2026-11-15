-- Conquistas são gravadas só pela API (dona das tabelas). Quem está logado lê
-- as desbloqueadas (sem seen_at, que só a API usa); anon não tem acesso.
REVOKE ALL ON TABLE "user_achievements" FROM anon;--> statement-breakpoint
REVOKE ALL ON TABLE "user_achievements" FROM authenticated;--> statement-breakpoint
GRANT SELECT ("id", "user_id", "key", "unlocked_at") ON TABLE "user_achievements" TO authenticated;
