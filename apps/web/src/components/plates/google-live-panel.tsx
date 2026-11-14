"use client";

import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLivePlace } from "@/lib/plates/queries";
import { GoogleAttribution } from "./attribution";

/**
 * "Ver no Google": telefone, horário, site e fotos direto do Google, na hora,
 * sem salvar nada. Só carrega quando alguém pede (é a consulta mais cara da cota).
 */
export function GoogleLivePanel({ placeId }: { placeId: string }) {
  const [open, setOpen] = useState(false);
  const live = useLivePlace(placeId, open);

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Ver no Google
      </Button>
    );
  }

  return (
    <section aria-label="Dados do Google" className="flex flex-col gap-4 rounded-md border border-rule-strong p-4">
      <header className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg leading-tight">Agora no Google</h3>
        <GoogleAttribution />
      </header>
      {live.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : live.isError ? (
        <p className="text-sm text-soft">Os dados do Google não estão disponíveis agora.</p>
      ) : (
        <>
          <dl className="grid gap-3 text-[0.9375rem]">
            {live.data.phone ? (
              <div>
                <dt className="font-micro text-[0.75rem] text-soft">Telefone</dt>
                <dd>
                  <a href={`tel:${live.data.phone.replace(/[^\d+]/g, "")}`} className="underline underline-offset-3">
                    {live.data.phone}
                  </a>
                </dd>
              </div>
            ) : null}
            {live.data.website ? (
              <div>
                <dt className="font-micro text-[0.75rem] text-soft">Site</dt>
                <dd className="truncate">
                  <a href={live.data.website} target="_blank" rel="noreferrer" className="underline underline-offset-3">
                    {live.data.website.replace(/^https?:\/\//, "")}
                  </a>
                </dd>
              </div>
            ) : null}
            {live.data.openingHours?.length ? (
              <div>
                <dt className="font-micro text-[0.75rem] text-soft">Horário</dt>
                <dd>
                  <ul className="text-sm leading-relaxed">
                    {live.data.openingHours.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            ) : null}
          </dl>
          {live.data.photos.length > 0 ? (
            <ul className="grid grid-cols-3 gap-2">
              {live.data.photos.map((photo) => (
                <li key={photo.url} className="flex flex-col gap-1">
                  {/* Fotos do Google são exibidas direto do Google, sem passar pelo otimizador nem ficar em cache. */}
                  {/* eslint-disable-next-line @next/next/no-img-element -- imagem externa, ao vivo */}
                  <img src={photo.url} alt="" loading="lazy" className="aspect-square w-full rounded-sm object-cover" />
                  <span className="truncate text-[0.6875rem] text-soft">{photo.attribution}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <a href={live.data.mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 self-start text-sm font-semibold underline underline-offset-3">
            Abrir no Google Maps
            <ExternalLink aria-hidden className="size-4" />
          </a>
        </>
      )}
    </section>
  );
}
