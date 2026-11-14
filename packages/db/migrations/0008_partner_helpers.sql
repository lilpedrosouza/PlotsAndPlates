-- Par de uma pessoa (ou nulo). plpgsql para poder ser criada antes da tabela
-- couple_members (o corpo só é checado ao rodar); security definer para as
-- policies poderem consultar o casal sem depender das permissões de quem chama.
CREATE OR REPLACE FUNCTION public.partner_of(uid uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT other.user_id
    FROM public.couple_members mine
    JOIN public.couple_members other ON other.couple_id = mine.couple_id AND other.user_id <> mine.user_id
    WHERE mine.user_id = uid
    LIMIT 1
  );
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.partner_of(uuid) FROM public;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.partner_of(uuid) TO authenticated;--> statement-breakpoint
-- Quem pode editar um restaurante: quem cadastrou ou o par dessa pessoa.
CREATE OR REPLACE FUNCTION public.can_edit_restaurant(rid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = rid AND (r.created_by = auth.uid() OR r.created_by = public.partner_of(auth.uid()))
  );
END;
$$;
