-- Permissões explícitas na tabela de perfis.
-- Projetos novos do Supabase podem não dar acesso automático às tabelas criadas
-- em `public`; sem isso, a API (que roda as consultas como `authenticated`)
-- recebe "permission denied". O RLS continua decidindo quais linhas cada um vê.
-- Visitante sem login (`anon`) não tem acesso nenhum, e ninguém apaga perfis
-- pela API (a exclusão vem em cascata da conta em auth.users).
REVOKE ALL ON TABLE "profiles" FROM anon;--> statement-breakpoint
REVOKE ALL ON TABLE "profiles" FROM authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "profiles" TO authenticated;--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO authenticated;
