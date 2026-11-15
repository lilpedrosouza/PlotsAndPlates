"use client";

import { type AccentKey, type SideBySide, type Wrapped, type WrappedComparison, cuisineLabel, formatRating } from "@pap/shared";
import type { ReactNode } from "react";
import { AchievementBadge } from "@/components/achievements/badge";
import { ArchPhoto } from "@/components/plates/arch-photo";
import { Poster } from "@/components/plots/poster";
import { SectionProvider } from "@/components/shell/section-context";
import { Avatar } from "@/components/ui/avatar";
import { Stamp } from "@/components/ui/stamp";
import { firstName } from "@/components/couple/added-by";
import type { Section } from "@/lib/section";
import { cn } from "@/lib/utils";

export type Story = { id: string; world: Section | "split"; render: () => ReactNode };

const hoursOf = (minutes: number) => Math.round(minutes / 60);
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** Um story inteiro no material de um mundo, com a assinatura no pé (sai também na imagem). */
function Frame({ world, accent, year, children, className }: { world: Section; accent: AccentKey; year: number; children: ReactNode; className?: string }) {
  return (
    <SectionProvider section={world}>
      <div data-theme={world} data-accent={accent} className="absolute inset-0 bg-background text-foreground">
        <div
          className={cn(
            "absolute inset-3 flex flex-col px-5 pt-14 pb-14",
            world === "plates" ? "frame-label" : "border border-rule",
            className,
          )}
        >
          {children}
          <p className="font-micro absolute inset-x-0 bottom-4 text-center text-[0.6875rem] tracking-[0.18em] text-soft uppercase">PAP · {year}</p>
        </div>
      </div>
    </SectionProvider>
  );
}

/** O número que vira ilustração. */
function Big({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("font-display leading-[0.9] tabular-nums text-[clamp(4rem,28vw,6rem)]", className)}>{children}</p>;
}

/** Linha de cardápio: rótulo, pontilhado, valor. */
function MenuLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex items-baseline gap-2 text-[1.125rem]">
      <span className="font-display">{label}</span>
      <span aria-hidden className="mb-[0.3em] min-w-6 flex-1 border-b-2 border-dotted border-rule-strong" />
      <span className="font-display tabular-nums">{value}</span>
    </p>
  );
}

function ThreeStamps({ ratings, partnerName, partnerAccent }: { ratings: SideBySide; partnerName: string | null; partnerAccent?: AccentKey }) {
  return (
    <div className="flex items-end justify-center gap-3">
      <Stamp value={ratings.mine} caption="você" size="sm" tilt={-7} />
      {partnerName ? <Stamp value={ratings.partner} caption={partnerName.toLowerCase()} size="sm" tilt={-3} accent={partnerAccent} /> : null}
      {partnerName ? <Stamp value={ratings.couple} caption="casal" size="md" tone="ink" tilt={-5} /> : null}
    </div>
  );
}

/** Metade de cima creme, metade de baixo preta, e o ano atravessando as duas. */
function Split({ wrapped, accent, children }: { wrapped: Wrapped; accent: AccentKey; children: ReactNode }) {
  const year = String(wrapped.year);
  const yearText = "font-display absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[clamp(6rem,40vw,11rem)] leading-none tracking-[-0.04em] tabular-nums";
  return (
    <div className="absolute inset-0">
      <div data-theme="plates" data-accent={accent} className="absolute inset-x-0 top-0 h-1/2 overflow-hidden bg-background text-foreground">
        <p aria-hidden className={cn(yearText, "top-full")}>
          {year}
        </p>
      </div>
      <div data-theme="plots" data-accent={accent} className="absolute inset-x-0 bottom-0 h-1/2 overflow-hidden bg-background text-brand">
        <p aria-hidden className={cn(yearText, "top-0")}>
          {year}
        </p>
      </div>
      <h2 className="sr-only">{year}</h2>
      {children}
    </div>
  );
}

function Comparison({ item, partnerName, partnerAccent, apart }: { item: WrappedComparison; partnerName: string; partnerAccent?: AccentKey; apart: boolean }) {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex items-center justify-center gap-4">
        <Stamp value={item.mine} caption="você" size="lg" tilt={apart ? -14 : -6} />
        <Stamp value={item.partner} caption={partnerName.toLowerCase()} size="lg" tilt={apart ? 12 : -6} accent={partnerAccent} />
      </div>
      <p className="font-display text-center text-[1.75rem] leading-tight [overflow-wrap:anywhere]">{item.name}</p>
    </div>
  );
}

/** A lista de stories do ano; os que não têm dado ficam de fora. */
export function buildStories(wrapped: Wrapped): Story[] {
  const [me, partner] = wrapped.people;
  const accent = (me?.accent ?? "padrao") as AccentKey;
  const partnerName = partner ? firstName(partner.displayName) : null;
  const names = partner ? `${firstName(me?.displayName ?? "")} & ${partnerName}` : firstName(me?.displayName ?? "");
  const { plates, plots, couple, year } = wrapped;
  const stories: Story[] = [];
  const frame = (world: Section, children: ReactNode, className?: string) => (
    <Frame world={world} accent={accent} year={year} className={className}>
      {children}
    </Frame>
  );

  stories.push({
    id: "abertura",
    world: "split",
    render: () => (
      <Split wrapped={wrapped} accent={accent}>
        <div data-theme="plates" data-accent={accent} className="absolute inset-x-0 top-[12%] flex flex-col items-center gap-3 px-6 text-center text-foreground">
          <div className="flex">
            {wrapped.people.map((person, index) => (
              <Avatar key={person.id} name={person.displayName} src={person.avatarUrl} size={56} accent={person.accent} world="plates" className={cn(index > 0 && "-ml-4 ring-4 ring-background")} />
            ))}
          </div>
          <p className="font-display text-[1.75rem] leading-tight">O ano de {names}</p>
        </div>
        <p data-theme="plots" data-accent={accent} className="font-micro absolute inset-x-0 bottom-[12%] text-center text-[0.875rem] tracking-[0.2em] text-soft uppercase">
          {wrapped.partial ? "Até agora" : "Retrospectiva"} · PAP Wrapped
        </p>
      </Split>
    ),
  });

  if (plates.visits > 0) {
    stories.push({
      id: "plates-numeros",
      world: "plates",
      render: () =>
        frame(
          "plates",
          <div className="flex flex-1 flex-col justify-center gap-6">
            <div className="rule-double pt-4">
              <Big className="text-brand">{plates.restaurants}</Big>
              <h2 className="font-display mt-2 text-[1.75rem] leading-tight italic">{plates.restaurants === 1 ? "restaurante" : "restaurantes diferentes"}</h2>
            </div>
            <div className="flex flex-col gap-2">
              <MenuLine label="Visitas" value={String(plates.visits)} />
              <MenuLine label="Pratos pedidos" value={String(plates.dishes)} />
            </div>
          </div>,
        ),
    });
  }

  if (plots.sessions > 0) {
    stories.push({
      id: "plots-numeros",
      world: "plots",
      render: () =>
        frame(
          "plots",
          <div className="flex flex-1 flex-col justify-center gap-6">
            <div>
              <Big className="text-brand uppercase">{hoursOf(plots.minutes)}</Big>
              <h2 className="font-display mt-2 text-[1.5rem] leading-tight uppercase">horas de sessão</h2>
            </div>
            <dl className="font-micro grid grid-cols-3 gap-2 border-t border-rule pt-4 text-[0.75rem] tracking-[0.12em] uppercase">
              {(
                [
                  [plural(plots.sessions, "sessão", "sessões"), "no diário"],
                  [plural(plots.titles, "título", "títulos"), "diferentes"],
                  [String(plots.together), "juntos"],
                ] as const
              ).map(([value, label]) => (
                <div key={label} className="flex flex-col gap-1">
                  <dt className="order-2 text-soft">{label}</dt>
                  <dd className="order-1 text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </div>,
        ),
    });
  }

  if (plates.favoriteCuisine) {
    const cuisine = plates.favoriteCuisine;
    stories.push({
      id: "cozinha",
      world: "plates",
      render: () =>
        frame(
          "plates",
          <div className="flex flex-1 flex-col justify-center gap-5">
            <h2 className="font-display text-[clamp(3rem,16vw,4.5rem)] leading-[0.95] text-brand italic [overflow-wrap:anywhere]">{cuisineLabel(cuisine.name)}</h2>
            <p className="font-micro rule-double pt-3 text-[0.875rem] text-soft">Nº {String(cuisine.count).padStart(4, "0")} no caderno do ano</p>
            <p className="font-display text-[1.25rem] leading-snug">
              A cozinha que mais apareceu: {plural(cuisine.count, "visita", "visitas")}.
              {plates.mostVisited ? ` E o lugar de sempre foi ${plates.mostVisited.name} (${plural(plates.mostVisited.visits, "vez", "vezes")}).` : ""}
            </p>
          </div>,
        ),
    });
  }

  if (plots.favoriteGenre) {
    const genre = plots.favoriteGenre;
    stories.push({
      id: "genero",
      world: "plots",
      render: () =>
        frame(
          "plots",
          <div className="relative flex flex-1 flex-col justify-center gap-6 overflow-hidden">
            <div aria-hidden className="-mx-10 -rotate-6 bg-brand py-3 text-on-brand">
              <p className="font-display whitespace-nowrap text-[2rem] uppercase">
                {`${genre.name} · `.repeat(6)}
              </p>
            </div>
            <h2 className="font-display text-[1.75rem] leading-tight uppercase">{genre.name}</h2>
            <p className="text-soft">O gênero de {plural(genre.count, "sessão", "sessões")} no ano.</p>
            {plots.mostWatched ? (
              <div className="flex items-center gap-3">
                <div className="w-14 shrink-0">
                  <Poster path={plots.mostWatched.posterPath} title={plots.mostWatched.title} size="w185" seed={plots.mostWatched.id} />
                </div>
                <p className="font-micro text-[0.75rem] tracking-[0.1em] uppercase">
                  Mais visto: <span className="text-brand">{plots.mostWatched.title}</span> · {plural(plots.mostWatched.sessions, "sessão", "sessões")}
                </p>
              </div>
            ) : null}
          </div>,
        ),
    });
  }

  if (plates.champion) {
    const champion = plates.champion;
    stories.push({
      id: "campeao-mesa",
      world: "plates",
      render: () =>
        frame(
          "plates",
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="relative w-[min(13rem,55vw)]">
              <ArchPhoto src={champion.coverThumbUrl} alt={`Foto de ${champion.name}`} sizes="13rem" />
            </div>
            <ThreeStamps ratings={champion.ratings} partnerName={partnerName} partnerAccent={partner?.accent} />
            <h2 className="font-display text-[2rem] leading-tight [overflow-wrap:anywhere]">{champion.name}</h2>
            <p className="text-soft">{partner ? "A maior nota do casal no ano." : "A sua maior nota no ano."}</p>
          </div>,
        ),
    });
  }

  if (plots.champion) {
    const champion = plots.champion;
    stories.push({
      id: "campeao-tela",
      world: "plots",
      render: () =>
        frame(
          "plots",
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="w-[min(11rem,46vw)]">
              <Poster path={champion.posterPath} title={champion.title} size="w342" seed={champion.id} />
            </div>
            <ThreeStamps ratings={champion.ratings} partnerName={partnerName} partnerAccent={partner?.accent} />
            <h2 className="font-display text-[1.5rem] leading-tight text-brand uppercase [overflow-wrap:anywhere]">{champion.title}</h2>
            <p className="text-soft">{partner ? "O título de maior nota do casal." : "O título de maior nota no ano."}</p>
          </div>,
        ),
    });
  }

  if (couple?.agreed && partnerName) {
    const agreed = couple.agreed;
    stories.push({
      id: "concordaram",
      world: "plates",
      render: () =>
        frame(
          "plates",
          <div className="flex flex-1 flex-col justify-center gap-8">
            <h2 className="font-display text-[2rem] leading-tight">Onde vocês concordaram</h2>
            <Comparison item={agreed} partnerName={partnerName} partnerAccent={partner?.accent} apart={false} />
            <p className="font-display text-center text-[1.125rem] italic">{plural(couple.equal, "nota igual", "notas iguais")} no ano.</p>
          </div>,
        ),
    });
  }

  if (couple?.disagreed && partnerName) {
    const disagreed = couple.disagreed;
    stories.push({
      id: "discordaram",
      world: "plots",
      render: () =>
        frame(
          "plots",
          <div className="flex flex-1 flex-col justify-center gap-8">
            <h2 className="font-display text-[1.75rem] leading-tight uppercase">Onde vocês discordaram</h2>
            <Comparison item={disagreed} partnerName={partnerName} partnerAccent={partner?.accent} apart />
            <p className="font-micro text-center text-[0.75rem] tracking-[0.12em] text-soft uppercase">
              {formatRating(Math.abs(disagreed.mine - disagreed.partner))} estrelas de diferença
            </p>
          </div>,
        ),
    });
  }

  if (wrapped.achievements.length > 0) {
    stories.push({
      id: "conquistas",
      world: "plates",
      render: () =>
        frame(
          "plates",
          <div className="flex flex-1 flex-col justify-center gap-6">
            <div>
              <Big className="text-brand">{wrapped.achievements.length}</Big>
              <h2 className="font-display mt-2 text-[1.75rem] leading-tight italic">{wrapped.achievements.length === 1 ? "conquista no ano" : "conquistas no ano"}</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {wrapped.achievements.slice(0, 6).map((item) => (
                <AchievementBadge key={item.key} achievementKey={item.key} unlocked size={64} className="justify-self-center" />
              ))}
            </div>
          </div>,
        ),
    });
  }

  stories.push({
    id: "encerramento",
    world: "split",
    render: () => (
      <Split wrapped={wrapped} accent={accent}>
        <div data-theme="plates" data-accent={accent} className="absolute inset-x-0 top-[17%] flex flex-col gap-1.5 px-8 text-foreground">
          <MenuLine label="Restaurantes" value={String(plates.restaurants)} />
          <MenuLine label="Visitas" value={String(plates.visits)} />
          <MenuLine label="Pratos" value={String(plates.dishes)} />
        </div>
        <dl data-theme="plots" data-accent={accent} className="font-micro absolute inset-x-0 bottom-[12%] grid grid-cols-3 gap-2 px-8 text-[0.75rem] tracking-[0.12em] uppercase">
          {(
            [
              [String(plots.sessions), "sessões"],
              [String(hoursOf(plots.minutes)), "horas"],
              [String(plots.titles), "títulos"],
            ] as const
          ).map(([value, label]) => (
            <div key={label} className="flex flex-col gap-1">
              <dt className="order-2 text-soft">{label}</dt>
              <dd className="font-display order-1 text-[2rem] leading-none text-brand tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </Split>
    ),
  });

  return stories;
}
