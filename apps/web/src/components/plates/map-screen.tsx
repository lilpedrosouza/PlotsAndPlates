"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMapPins } from "@/lib/plates/queries";

/** O MapLibre só é baixado nesta tela. */
const PlatesMap = dynamic(() => import("./plates-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-md" />,
});

export function MapScreen() {
  const pins = useMapPins();
  const count = pins.data?.length ?? 0;

  return (
    <div className="flex flex-col gap-4 pt-2">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-[clamp(2rem,8vw,3rem)] leading-[1.05]">O mapa da gente</h1>
        <ul className="font-micro flex gap-4 text-[0.75rem] text-soft" aria-label="Legenda">
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="size-3.5 rounded-full border-2 border-surface bg-brand outline outline-1 outline-brand" />
            Fomos
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="size-3.5 rounded-full border-[3px] border-second bg-surface" />
            Quero ir
          </li>
        </ul>
      </header>
      <div className="relative h-[calc(100dvh_-_17rem)] min-h-80 md:h-[calc(100dvh_-_14rem)]">
        {pins.isPending ? (
          <Skeleton className="h-full w-full rounded-md" />
        ) : (
          <PlatesMap pins={pins.data ?? []} />
        )}
        {pins.isSuccess && count === 0 ? (
          <div className="pointer-events-none absolute inset-x-3 top-16 flex justify-center">
            <div className="pointer-events-auto flex max-w-sm flex-col items-start gap-3 rounded-md border border-rule-strong bg-surface p-4 shadow-lift">
              <p className="font-display text-lg leading-tight">Nenhum restaurante no mapa ainda</p>
              <p className="text-sm text-soft">Os restaurantes aparecem aqui quando têm o pin marcado no cadastro.</p>
              <Link href="/plates/novo" className={buttonVariants({ size: "sm" })}>
                Cadastrar restaurante
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
