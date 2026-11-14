import type { ReactNode } from "react";
import { SectionProvider } from "@/components/shell/section-context";
import { cn } from "@/lib/utils";

/**
 * Metade cartaz, metade rótulo. O "&" é um carimbo na emenda dos dois mundos.
 * No celular os mundos se empilham; em telas largas ficam lado a lado.
 * No celular o cartaz ocupa pouco mais de um terço da tela na entrada, para o
 * botão principal caber na primeira dobra; no primeiro acesso (formulário com
 * `data-porta="compact"`) ele encolhe para o campo de nome aparecer inteiro.
 */
export function PortaFrame({ fontClass, children }: { fontClass: string; children: ReactNode }) {
  return (
    <div className={cn(fontClass, "group grid min-h-dvh grid-rows-[auto_1fr] md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:grid-rows-1")}>
      {/* Cartaz */}
      <div
        data-theme="plots"
        className="relative flex min-h-[36dvh] flex-col justify-end overflow-hidden px-6 group-has-[[data-porta=compact]]:min-h-0 pt-[max(2.5rem,env(safe-area-inset-top))] pb-9 md:min-h-0 md:px-12 md:pb-14"
      >
        <p aria-hidden className="font-display text-[clamp(4.5rem,27vw,9rem)] leading-[0.82] text-brand group-has-[[data-porta=compact]]:text-[clamp(4.5rem,24vw,9rem)] md:text-[clamp(6rem,11vw,10.5rem)]">
          Plots
        </p>
        <p className="font-micro mt-4 max-w-[22rem] text-[0.8125rem] leading-snug text-soft">
          Um diário a dois · Filmes · Séries · Documentários · Animes · Cada um com a própria nota, lado a lado
        </p>
      </div>

      {/* Rótulo */}
      <SectionProvider section="plates">
        <div data-theme="plates" className="relative flex flex-col px-6 pt-11 pb-[max(2rem,env(safe-area-inset-bottom))] md:justify-center md:px-14 md:pt-10">
          {/* Carimbo na emenda */}
          <span
            aria-hidden
            className="font-display absolute -top-9 right-6 flex size-[4.5rem] -rotate-12 items-center justify-center rounded-full border-2 border-brand bg-background text-[2.5rem] leading-none text-brand outline outline-1 -outline-offset-[6px] outline-brand/70 md:top-1/2 md:right-auto md:-left-10 md:size-20 md:-translate-y-1/2"
          >
            &amp;
          </span>

          <div className="mx-auto w-full max-w-sm">
            <h1 className="font-display text-[clamp(3rem,15vw,4.25rem)] leading-[0.95]">
              <span className="sr-only">Plots &amp; </span>Plates
            </h1>
            <p className="mt-2 max-w-[30ch] text-[1.0625rem] leading-snug text-soft">
              O diário a dois do que a gente come e do que a gente assiste.
            </p>
            <div className="rule-double mt-5 pt-6">{children}</div>
          </div>
        </div>
      </SectionProvider>
    </div>
  );
}
