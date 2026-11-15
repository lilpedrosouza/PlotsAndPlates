ALTER TABLE "visits" ADD COLUMN "together_with" uuid;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_together_with_users_id_fk" FOREIGN KEY ("together_with") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER POLICY "visits_select_own" ON "visits" TO authenticated USING ("visits"."user_id" = (select auth.uid()) or ("visits"."together" and "visits"."together_with" = (select auth.uid()) and "visits"."user_id" = public.partner_of((select auth.uid()))));--> statement-breakpoint
ALTER POLICY "visits_update_own" ON "visits" TO authenticated USING ("visits"."user_id" = (select auth.uid()) or ("visits"."together" and "visits"."together_with" = (select auth.uid()) and "visits"."user_id" = public.partner_of((select auth.uid())))) WITH CHECK ("visits"."user_id" = (select auth.uid()) or ("visits"."together_with" = (select auth.uid()) and "visits"."user_id" = public.partner_of((select auth.uid()))));--> statement-breakpoint
-- Visitas "juntos" que já existem ficam com o par atual de quem registrou.
UPDATE "visits" v SET "together_with" = other.user_id
FROM public.couple_members mine
JOIN public.couple_members other ON other.couple_id = mine.couple_id AND other.user_id <> mine.user_id
WHERE v.together AND v.together_with IS NULL AND mine.user_id = v.user_id;--> statement-breakpoint
-- "Juntos" sem ninguém com quem valer vira visita só de quem registrou.
UPDATE "visits" SET "together" = false WHERE "together" AND "together_with" IS NULL;--> statement-breakpoint
-- partner_of só responde sobre quem está logado: ninguém descobre quem é par de quem.
CREATE OR REPLACE FUNCTION public.partner_of(uid uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF uid IS DISTINCT FROM auth.uid() THEN
    RETURN NULL;
  END IF;
  RETURN (
    SELECT other.user_id
    FROM public.couple_members mine
    JOIN public.couple_members other ON other.couple_id = mine.couple_id AND other.user_id <> mine.user_id
    WHERE mine.user_id = uid
    LIMIT 1
  );
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.partner_of(uuid) FROM public, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.partner_of(uuid) TO authenticated;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.can_edit_restaurant(uuid) FROM public, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.can_edit_restaurant(uuid) TO authenticated;
