"use client";

import Link from "next/link";
import { PosterArt } from "@/components/art/poster-art";
import { buttonVariants } from "@/components/ui/button";
import { useMe } from "@/lib/queries";
import { cn } from "@/lib/utils";

/** Início de Plots. Na fase 1 a parede de cartazes ainda está vazia. */
export function PlotsHome() {
  const profile = useMe().data?.profile;
  const firstName = profile?.displayName.split(/\s+/)[0] ?? "";

  return (
    <div className="flex flex-col gap-9 pt-3">
      <section>
        <h1 className="font-display text-[clamp(2.5rem,11vw,4.5rem)] leading-[1.14]">
          Nenhuma sessão ainda, {firstName}
        </h1>
        <p className="font-micro mt-3 text-[0.8125rem] text-soft">Diário de {profile?.displayName} · 0 sessões</p>
        <p className="mt-4 max-w-[52ch] text-[1.0625rem] leading-relaxed text-soft">
          Cada filme ou série que a gente assistir vira um cartaz nesta parede, com a nota de cada um nos créditos.
        </p>
      </section>

      {/* O cartaz em branco mostra como uma sessão vai ficar. */}
      <section aria-label="Como vai ficar um registro" className="grid gap-7 sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-center">
        <div className="max-w-[14rem] border border-rule-strong bg-surface">
          <div className="aspect-[2/3] overflow-hidden">
            <PosterArt variant="sol" />
          </div>
          <div className="px-3 pt-3 pb-3.5">
            <p className="font-display text-[1.375rem] leading-[1.14] text-brand">A primeira sessão</p>
            <p className="font-micro mt-2 border-t border-rule pt-2 text-[0.75rem] leading-snug text-soft">
              Sessão nº 0001 · Um título que a gente ainda vai ver · Você – · Par –
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-4">
          <h2 className="font-display text-xl leading-[1.14]">Em breve em cartaz</h2>
          <p className="max-w-[46ch] leading-relaxed text-soft">
            A busca de títulos e o diário chegam numa próxima etapa do PAP. Por enquanto, dá para marcar no perfil os
            streamings que a gente assina.
          </p>
          <Link href="/plots/perfil" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
            Marcar meus streamings
          </Link>
        </div>
      </section>
    </div>
  );
}
