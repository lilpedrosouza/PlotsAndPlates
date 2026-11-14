"use client";

import type { TitleSummary } from "@pap/shared";
import { ArrowLeft, ArrowRight, Plus, X } from "lucide-react";
import { useState } from "react";
import { Sheet } from "@/components/plates/sheet";
import { Button } from "@/components/ui/button";
import { useSetFavorites } from "@/lib/plots/mutations";
import { openTmdbTitle, useFavorites, useTmdbSearch } from "@/lib/plots/queries";
import { cn } from "@/lib/utils";
import { Poster } from "./poster";

const SLOTS = [0, 1, 2, 3] as const;

/** Top 4 do perfil: quatro molduras de pôster; tocar numa vazia busca no TMDB. */
export function FavoritesEditor() {
  const favorites = useFavorites();
  const setFavorites = useSetFavorites();
  const [picking, setPicking] = useState<number | null>(null);
  const [acting, setActing] = useState<number | null>(null);
  const [pickKey, setPickKey] = useState(0);
  const titles = favorites.data ?? [];
  const ids = titles.map((title) => title.id);

  const save = (next: string[]) => setFavorites.mutate(next);
  const move = (index: number, delta: number) => {
    const next = [...ids];
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(index + delta, 0, moved);
    save(next);
  };

  return (
    <section aria-labelledby="top4" className="flex flex-col gap-4 border-b border-rule-strong pb-8">
      <header className="flex flex-col gap-1">
        <h2 id="top4" className="font-display text-[1.5rem] leading-[1.14]">
          Top 4
        </h2>
        <p className="text-sm text-soft">Os quatro títulos que dizem quem você é. Aparecem no seu perfil.</p>
      </header>
      <ol className="grid grid-cols-4 gap-1.5 sm:gap-3">
        {SLOTS.map((slot) => {
          const title: TitleSummary | undefined = titles[slot];
          return (
            <li key={slot} className="flex flex-col gap-1.5">
              {title ? (
                <button
                  type="button"
                  onClick={() => setActing(slot)}
                  aria-label={`${slot + 1}º do Top 4: ${title.title}. Mover ou tirar`}
                  className="flex flex-col gap-1.5 text-left transition-transform duration-fast active:scale-[0.97]"
                >
                  <Poster path={title.posterPath} title={title.title} size="w185" seed={`${title.tmdbType}:${title.id}`} />
                  <span className="font-micro truncate text-[0.625rem] text-soft">{title.title}</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={slot !== titles.length}
                  onClick={() => {
                    setPickKey((key) => key + 1);
                    setPicking(slot);
                  }}
                  aria-label={`Escolher o ${slot + 1}º do Top 4`}
                  className={cn(
                    "flex aspect-[2/3] items-center justify-center border-2 border-dashed border-rule-strong text-soft transition-colors duration-fast",
                    slot === titles.length ? "hover:border-brand hover:text-brand" : "opacity-40",
                  )}
                >
                  <Plus aria-hidden className="size-6" />
                </button>
              )}
            </li>
          );
        })}
      </ol>
      {setFavorites.error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {setFavorites.error.message}
        </p>
      ) : null}
      <Sheet
        open={acting !== null}
        onOpenChange={(open) => !open && setActing(null)}
        title={acting !== null ? (titles[acting]?.title ?? "Top 4") : "Top 4"}
        description={acting !== null ? `${acting + 1}º do Top 4` : undefined}
      >
        {acting !== null ? (
          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              disabled={acting === 0}
              onClick={() => {
                move(acting, -1);
                setActing(null);
              }}
            >
              <ArrowLeft aria-hidden />
              Mover para a esquerda
            </Button>
            <Button
              variant="secondary"
              disabled={acting === titles.length - 1}
              onClick={() => {
                move(acting, 1);
                setActing(null);
              }}
            >
              <ArrowRight aria-hidden />
              Mover para a direita
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                save(ids.filter((id) => id !== titles[acting]?.id));
                setActing(null);
              }}
            >
              <X aria-hidden />
              Tirar do Top 4
            </Button>
          </div>
        ) : null}
      </Sheet>
      <PickSheet
        key={pickKey}
        open={picking !== null}
        onOpenChange={(open) => !open && setPicking(null)}
        onPick={(id) => {
          if (!ids.includes(id)) save([...ids, id]);
          setPicking(null);
        }}
      />
    </section>
  );
}

function PickSheet({ open, onOpenChange, onPick }: { open: boolean; onOpenChange: (open: boolean) => void; onPick: (titleId: string) => void }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const search = useTmdbSearch(q);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Escolher título">
      <div className="flex flex-col gap-4">
        <input
          type="text"
          inputMode="search"
          aria-label="Buscar filme ou série"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Nome do filme ou da série"
          className="h-12 w-full rounded-md border border-rule-strong bg-sunken px-3.5 text-foreground outline-none focus-visible:border-brand"
        />
        <ul className="grid grid-cols-3 gap-3">
          {(search.data ?? []).map((result) => {
            const key = `${result.tmdbType}:${result.tmdbId}`;
            return (
              <li key={key}>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={async () => {
                    setBusy(key);
                    try {
                      onPick(await openTmdbTitle(result.tmdbType, result.tmdbId));
                    } finally {
                      setBusy(null);
                    }
                  }}
                  className={cn("flex w-full flex-col gap-1.5 text-left", busy === key && "opacity-60")}
                >
                  <Poster path={result.posterPath} title={result.title} size="w185" seed={key} />
                  <span className="font-display line-clamp-2 text-[0.8125rem] leading-[1.14]">{result.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </Sheet>
  );
}
