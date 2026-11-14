-- O casal é gravado só pela API (dona das tabelas), depois de validar o convite.
-- Quem está logado só lê o que é seu; anon não tem acesso.
REVOKE ALL ON TABLE "couple_members", "couple_invites" FROM anon;--> statement-breakpoint
REVOKE ALL ON TABLE "couple_members", "couple_invites" FROM authenticated;--> statement-breakpoint
GRANT SELECT ON TABLE "couple_members", "couple_invites" TO authenticated;
