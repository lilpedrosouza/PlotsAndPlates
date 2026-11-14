"use client";

import { coupleRating, formatRating } from "@pap/shared";
import { Plus } from "lucide-react";
import { useState } from "react";
import { PlateArt } from "@/components/art/plate-art";
import { PosterArt } from "@/components/art/poster-art";
import { useSection } from "@/components/shell/section-context";
import { Button } from "@/components/ui/button";
import { ChipToggle } from "@/components/ui/chip";
import { TextField } from "@/components/ui/field";
import { NumberRoll } from "@/components/ui/number-roll";
import { RatingInput, RatingStars } from "@/components/ui/rating";
import { Skeleton } from "@/components/ui/skeleton";
import { Stamp } from "@/components/ui/stamp";
import { cn } from "@/lib/utils";

const COLORS = [
  { token: "background", label: "Fundo", className: "bg-background" },
  { token: "surface", label: "Folha", className: "bg-surface" },
  { token: "sunken", label: "Rebaixo", className: "bg-sunken" },
  { token: "foreground", label: "Tinta", className: "bg-foreground" },
  { token: "soft", label: "Tinta suave", className: "bg-soft" },
  { token: "brand", label: "Destaque", className: "bg-brand" },
  { token: "second", label: "Segunda tinta", className: "bg-second" },
  { token: "danger", label: "Erro", className: "bg-danger" },
];

const WORLD = {
  plates: {
    title: "Rótulo",
    lead: "Papel creme impresso em duas tintas. Clarendon nos títulos, foto em arco, nota carimbada.",
    display: "Besley",
    body: "Sofia Sans",
    motion: "Papel: assenta macio, com uma sobra leve. 140 / 260 / 520 ms.",
  },
  plots: {
    title: "Cartaz",
    lead: "Preto fosco com amarelo-legenda. Futura em caixa alta, pôster de canto vivo, notas nos créditos.",
    display: "Jost",
    body: "Jost",
    motion: "Corte de montagem: seco, sem sobra. 110 / 200 / 420 ms.",
  },
};

/** Vitrine do sistema de design do mundo atual. Os dados são de exemplo. */
export function StyleGuide() {
  const section = useSection();
  const world = WORLD[section];
  const [mine, setMine] = useState<number | null>(4.5);
  const [partner, setPartner] = useState<number | null>(4);
  const [filters, setFilters] = useState<string[]>(["Italiana"]);
  const couple = coupleRating(mine, partner);

  return (
    <div className="flex flex-col gap-[var(--pap-space-section)] pt-3">
      <header>
        <h1 className="font-display text-[clamp(2.75rem,12vw,5rem)] leading-[1.14]">{world.title}</h1>
        <p className="font-micro mt-3 text-[0.8125rem] text-soft">Guia de estilo · dados de exemplo</p>
        <p className="mt-4 max-w-[48ch] text-[1.0625rem] leading-relaxed text-soft">{world.lead}</p>
      </header>

      <Block title="Nota de cada um, lado a lado">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="font-micro text-[0.8125rem] text-soft">Você</span>
            <RatingInput label="Sua nota" value={mine} onChange={setMine} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-micro text-[0.8125rem] text-soft">Seu par</span>
            <RatingInput label="Nota do par" value={partner} onChange={setPartner} />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-5 border-t border-rule pt-6">
          <Stamp value={mine} caption="você" />
          <Stamp value={partner} caption="par" />
          <Stamp value={couple.average} caption="casal" size="lg" />
          <p className="max-w-[26ch] text-soft">
            Média do casal: <strong className="text-foreground">{formatRating(couple.average)}</strong>
            {couple.difference !== null ? (
              <>
                {" "}
                · diferença de <strong className="text-foreground">{formatRating(couple.difference)}</strong>
              </>
            ) : null}
          </p>
        </div>
      </Block>

      <Block title="Um registro">
        {section === "plates" ? (
          <article className="frame-label max-w-xs bg-surface p-4">
            <PlateArt className="arch aspect-[4/5] w-full" />
            <div className="rule-double mt-4 pt-3">
              <h3 className="font-display text-2xl leading-tight">Cantina de Exemplo</h3>
              <p className="mt-1 text-soft">Italiana · bairro fictício</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="font-micro text-[0.75rem] text-soft">Visita nº 0012</span>
                <Stamp value={couple.average} caption="casal" size="sm" />
              </div>
            </div>
          </article>
        ) : (
          <div>
            <ul className="grid max-w-xl grid-cols-3 gap-2.5">
              {(["sol", "escada", "olho"] as const).map((variant, index) => (
                <li key={variant}>
                  <div className="aspect-[2/3] overflow-hidden bg-sunken">
                    <PosterArt variant={variant} />
                  </div>
                  <p className="font-micro mt-1.5 text-[0.6875rem] leading-tight text-soft">
                    Sessão nº {String(85 + index).padStart(4, "0")}
                  </p>
                </li>
              ))}
            </ul>
            <p className="font-micro mt-5 max-w-xl border-t border-rule pt-4 text-[0.9375rem] leading-snug">
              <span className="text-soft">Título de exemplo · sessão nº 0087 · você</span>{" "}
              <span className="text-brand">{formatRating(mine)}</span> <span className="text-soft">· par</span>{" "}
              <span className="text-brand">{formatRating(partner)}</span> <span className="text-soft">· casal</span>{" "}
              <span className="text-brand">{formatRating(couple.average)}</span>
            </p>
            <RatingStars value={mine} className="mt-3" />
          </div>
        )}
      </Block>

      <Block title="Botões e etiquetas">
        <div className="flex flex-wrap items-center gap-3">
          <Button>
            <Plus aria-hidden strokeWidth={2.25} />
            {section === "plates" ? "Fomos!" : "Assistimos!"}
          </Button>
          <Button variant="secondary">Depois eu vejo</Button>
          <Button variant="quiet">Cancelar</Button>
          <Button busy>Salvando</Button>
          <Button disabled>Indisponível</Button>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {(section === "plates" ? ["Italiana", "Japonesa", "Boteco", "Juntos"] : ["Filme", "Série", "Anime", "Juntos"]).map((name) => (
            <ChipToggle
              key={name}
              pressed={filters.includes(name)}
              onPressedChange={(on) => setFilters((current) => (on ? [...current, name] : current.filter((item) => item !== name)))}
            >
              {name}
            </ChipToggle>
          ))}
        </div>
      </Block>

      <Block title="Campos">
        <div className="grid max-w-xl gap-5 sm:grid-cols-2">
          <TextField label="Nome do lugar" placeholder="Como está na fachada" defaultValue="" />
          <TextField label="Username" prefix="@" defaultValue="ana" error="Esse @username já está em uso." />
        </div>
      </Block>

      <Block title="Tipografia">
        <div className="flex flex-col gap-5">
          <div>
            <p className="font-display text-[clamp(2.25rem,9vw,3.5rem)] leading-[1.14]">A gente foi e voltaria</p>
            <p className="font-micro mt-2 text-[0.75rem] text-soft">Título · {world.display}</p>
          </div>
          <div>
            <p className="max-w-[60ch] text-[1.0625rem] leading-relaxed">
              O risoto veio no ponto e a sobremesa sumiu antes da foto. Texto corrido em {world.body}, com medida
              confortável para ler review no celular.
            </p>
            <p className="font-micro mt-2 text-[0.75rem] text-soft">Texto · {world.body}</p>
          </div>
          <div>
            <p className="font-micro text-[1.0625rem]">Visita nº 0012 · 14 nov 2026 · juntos</p>
            <p className="font-micro mt-2 text-[0.75rem] text-soft">Letra miúda · Sofia Sans Extra Condensed</p>
          </div>
        </div>
      </Block>

      <Block title="Cores">
        <ul className="grid grid-cols-4 gap-x-3 gap-y-5 sm:grid-cols-8">
          {COLORS.map((color) => (
            <li key={color.token} className="flex flex-col gap-1.5">
              <span className={cn("aspect-square w-full border border-rule-strong", color.className, section === "plates" && "rounded-full")} />
              <span className="text-[0.8125rem] leading-tight">{color.label}</span>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Carregando e movimento">
        <div className="grid max-w-xl gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-3" aria-label="Exemplo de carregamento">
            <Skeleton className={cn("w-full", section === "plates" ? "arch aspect-[4/5] max-w-40" : "aspect-[2/3] max-w-32")} />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="flex flex-col gap-3">
            <p className="leading-relaxed text-soft">{world.motion}</p>
            <p className="font-display text-5xl">
              <NumberRoll value={formatRating(couple.average)} />
            </p>
            <p className="text-sm text-soft">Mude as notas lá em cima: os números giram dígito por dígito.</p>
          </div>
        </div>
      </Block>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-rule-strong pt-5">
      <h2 className="font-display mb-5 text-[1.375rem] leading-tight">{title}</h2>
      {children}
    </section>
  );
}
