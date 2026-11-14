"use client";

import Link from "next/link";
import { PlateArt } from "@/components/art/plate-art";
import { buttonVariants } from "@/components/ui/button";
import { useMe } from "@/lib/queries";
import { cn } from "@/lib/utils";

/** Início de Plates. Na fase 1 o caderno ainda está em branco. */
export function PlatesHome() {
  const profile = useMe().data?.profile;
  const firstName = profile?.displayName.split(/\s+/)[0] ?? "";

  return (
    <div className="flex flex-col gap-10 pt-4">
      <section>
        <h1 className="font-display text-[clamp(2.25rem,9vw,3.5rem)] leading-[1.02]">
          Oi, {firstName}. O caderno ainda está em branco.
        </h1>
        <p className="font-micro mt-3 text-[0.8125rem] text-soft">Caderno de {profile?.displayName} · 0 visitas</p>
        <p className="mt-4 max-w-[52ch] text-[1.0625rem] leading-relaxed text-soft">
          Cada restaurante que a gente visitar vira um rótulo aqui: a foto no arco, os pratos pedidos e a nota de cada um,
          lado a lado.
        </p>
      </section>

      {/* O rótulo em branco mostra como um registro vai ficar. */}
      <section aria-label="Como vai ficar um registro" className="grid gap-7 sm:grid-cols-[minmax(0,15rem)_1fr] sm:items-center">
        <div className="frame-label ml-1 max-w-[15rem] bg-surface p-3.5">
          <PlateArt variant="vazio" className="arch aspect-[4/5] w-full" />
          <div className="rule-double mt-4 flex flex-col gap-2 pt-3">
            <span className="h-5 w-3/4 rounded-xs border border-dashed border-rule-strong" />
            <span className="h-3.5 w-1/2 rounded-xs border border-dashed border-rule-strong" />
            <div className="mt-2 flex items-center justify-between">
              <span className="font-micro text-[0.75rem] text-soft">Visita nº 0001</span>
              <span className="font-display flex size-12 -rotate-6 items-center justify-center rounded-full border-2 border-dashed border-rule-strong text-lg text-soft">
                ?
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-start gap-4">
          <h2 className="font-display text-2xl leading-tight">O primeiro rótulo é o da próxima saída</h2>
          <p className="max-w-[44ch] leading-relaxed text-soft">
            O cadastro de restaurantes chega na próxima etapa do PAP. Por enquanto, dá para deixar o seu rótulo do seu jeito.
          </p>
          <Link href="/plates/perfil" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
            Ajeitar meu perfil
          </Link>
        </div>
      </section>
    </div>
  );
}
