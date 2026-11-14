"use client";

import { TITLE_KIND_LABELS, type TmdbSearchResult } from "@pap/shared";
import { Search as SearchIcon } from "lucide-react";
import { useId, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiRequestError } from "@/lib/api";
import { openTmdbTitle, useTmdbSearch } from "@/lib/plots/queries";
import { useTransitionNavigate } from "@/lib/transition-router";
import { cn } from "@/lib/utils";
import { POSTER_TRANSITION } from "./open-title";
import { Poster } from "./poster";
import { TmdbAttribution } from "./tmdb-attribution";

/** Busca de filmes e séries no TMDB. Tocar num pôster abre a página do título. */
export function Search() {
  const inputId = useId();
  const [q, setQ] = useState("");
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useTransitionNavigate();
  const search = useTmdbSearch(q);
  const results = search.data ?? [];
  const unavailable = search.error instanceof ApiRequestError && search.error.code === "tmdb_unavailable";

  const open = async (result: TmdbSearchResult, element: HTMLElement) => {
    const key = `${result.tmdbType}:${result.tmdbId}`;
    setError(null);
    setOpening(key);
    try {
      const id = await openTmdbTitle(result.tmdbType, result.tmdbId);
      const poster = element.querySelector<HTMLElement>("[data-poster]");
      if (poster) poster.style.viewTransitionName = POSTER_TRANSITION;
      navigate(`/plots/t/${id}`, { types: ["to-detail"] });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não deu para abrir esse título.");
      setOpening(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 pt-2 pb-20 md:pb-8">
      <h1 className="font-display text-[clamp(2.25rem,10vw,4rem)] leading-[1.14]">O que a gente viu?</h1>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="font-micro text-[0.8125rem] text-soft">
          Filme ou série
        </label>
        <div className="relative">
          <SearchIcon aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-soft" />
          <input
            id={inputId}
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Nome do filme ou da série"
            className="font-display h-16 w-full rounded-md border border-rule-strong bg-sunken pr-4 pl-12 text-[1.25rem] text-foreground uppercase outline-none transition-colors duration-fast placeholder:text-soft placeholder:normal-case focus-visible:border-brand"
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}

      {unavailable ? (
        <p role="alert" className="max-w-[52ch] text-soft">
          A busca de filmes e séries não está disponível agora. Se continuar assim, confira o token do TMDB na API.
        </p>
      ) : q.trim() === "" ? (
        <p className="max-w-[48ch] text-soft">Comece a digitar: os resultados vêm do TMDB, com pôster, ano e tipo.</p>
      ) : search.isPending && results.length === 0 ? (
        <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <li key={index}>
              <Skeleton className="aspect-[2/3] w-full" />
              <Skeleton className="mt-2 h-4 w-3/4" />
            </li>
          ))}
        </ul>
      ) : results.length === 0 ? (
        <p className="text-soft">Nada com esse nome no TMDB.</p>
      ) : (
        <ul className={cn("grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5", search.isPlaceholderData && "opacity-60")}>
          {results.map((result) => {
            const key = `${result.tmdbType}:${result.tmdbId}`;
            return (
              <li key={key}>
                <button
                  type="button"
                  disabled={opening !== null}
                  onClick={(event) => void open(result, event.currentTarget)}
                  className={cn("group flex w-full flex-col gap-2 text-left", opening === key && "opacity-60")}
                >
                  <div data-poster className="w-full transition-transform duration-fast group-active:scale-[0.97]">
                    <Poster path={result.posterPath} title={result.title} size="w342" seed={key} />
                  </div>
                  <span className="font-display line-clamp-2 text-[0.9375rem] leading-[1.14]">{result.title}</span>
                  <span className="font-micro -mt-1 text-[0.6875rem] text-soft">
                    {[result.year, TITLE_KIND_LABELS[result.kind]].filter(Boolean).join(" · ")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <TmdbAttribution />
    </div>
  );
}
