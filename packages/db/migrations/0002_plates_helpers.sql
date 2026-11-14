-- Quem pode editar um restaurante (dados, fotos e pratos).
-- Fase 2: quem cadastrou. Fase 4: também o par dessa pessoa.
-- plpgsql para poder ser criada antes da tabela (o corpo só é checado ao rodar);
-- security definer para a checagem não depender das policies de quem chama.
CREATE OR REPLACE FUNCTION public.can_edit_restaurant(rid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = rid AND r.created_by = auth.uid());
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.can_edit_restaurant(uuid) FROM public;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.can_edit_restaurant(uuid) TO authenticated;
