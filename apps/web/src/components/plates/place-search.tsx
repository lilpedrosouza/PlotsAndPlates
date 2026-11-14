"use client";

import type { PlaceResolveInput, PlaceSuggestion, RestaurantDraft } from "@pap/shared";
import { Link2, PenLine, Search } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiRequestError } from "@/lib/api";
import { resolvePlace, useAutocomplete } from "@/lib/plates/queries";
import { cn } from "@/lib/utils";
import { GoogleAttribution } from "./attribution";

/** Parece um link do Google Maps? (o resto é tratado como nome). */
const isMapsLink = (value: string) => /^https?:\/\/\S*(google\.[a-z.]+\/maps|maps\.google|goo\.gl|maps\.app)/i.test(value.trim());

/**
 * Primeiro passo do cadastro: um campo só, para o nome ou um link do Maps.
 * As sugestões vêm do Google (com o selo) ou, se ele falhar, do OpenStreetMap.
 */
export function PlaceSearch({
  session,
  onDraft,
  onExisting,
}: {
  session: string;
  onDraft: (draft: RestaurantDraft, query: string) => void;
  onExisting: (id: string) => void;
}) {
  const inputId = useId();
  const listId = useId();
  const [q, setQ] = useState("");
  const [resolving, setResolving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const link = isMapsLink(q);
  const suggestions = useAutocomplete(link ? "" : q, session);
  const items = suggestions.data?.suggestions ?? [];
  const source = suggestions.data?.source;

  const resolve = async (key: string, input: PlaceResolveInput) => {
    setError(null);
    setResolving(key);
    try {
      const draft = await resolvePlace(input);
      if (draft.existingId) onExisting(draft.existingId);
      else onDraft(draft, "query" in input ? input.query : "");
    } catch (failure) {
      setError(
        failure instanceof ApiRequestError && failure.code === "invalid_maps_url"
          ? "Esse link não parece ser de um lugar no Google Maps. Tenta copiar de novo pelo botão Compartilhar."
          : failure instanceof Error
            ? failure.message
            : "Não deu para buscar agora.",
      );
    } finally {
      setResolving(null);
    }
  };

  // O nome que segue para o rascunho é o que a pessoa digitou, nunca o nome
  // vindo do Google (os termos só permitem guardar o place_id).
  const choose = (suggestion: PlaceSuggestion) =>
    resolve(
      suggestion.id,
      suggestion.googlePlaceId
        ? { googlePlaceId: suggestion.googlePlaceId, query: q.trim().slice(0, 100), session }
        : { osmRef: suggestion.osmRef ?? "", query: suggestion.primary.slice(0, 100) },
    );

  const manual = () => onDraft({ source: "manual", fields: { name: q.trim().slice(0, 80) }, osmAttribution: false }, q.trim());

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="font-micro text-[0.8125rem] text-soft">
          Nome do restaurante ou link do Maps
        </label>
        <div className="relative">
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-soft">
            {link ? <Link2 className="size-5" /> : <Search className="size-5" />}
          </span>
          <input
            id={inputId}
            type="text"
            inputMode="search"
            role="combobox"
            aria-expanded={items.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            autoComplete="off"
            enterKeyHint={link ? "go" : "search"}
            value={q}
            onChange={(event) => setQ(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && link) {
                event.preventDefault();
                void resolve("link", { mapsUrl: q.trim() });
              }
            }}
            placeholder="Bar do Zé, Pinheiros…"
            className="font-display h-16 w-full rounded-md border border-rule-strong bg-surface pr-4 pl-12 text-[1.375rem] text-foreground outline-none transition-colors duration-fast placeholder:text-soft/80 focus-visible:border-brand"
          />
        </div>
      </div>

      {link ? (
        <Button block busy={resolving === "link"} onClick={() => void resolve("link", { mapsUrl: q.trim() })}>
          Buscar pelo link
        </Button>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}

      {!link && q.trim().length >= 2 ? (
        <div className="flex flex-col gap-2">
          {source === "osm" ? (
            <p className="text-sm text-soft">Resultados do OpenStreetMap.</p>
          ) : null}
          <ul id={listId} role="listbox" aria-label="Sugestões" className="border-t border-rule-strong">
            {suggestions.isPending && items.length === 0
              ? [0, 1, 2].map((index) => (
                  <li key={index} className="border-b border-rule py-3.5">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="mt-2 h-3 w-1/2" />
                  </li>
                ))
              : items.map((suggestion) => (
                  <li key={suggestion.id} role="option" aria-selected={false} className="border-b border-rule">
                    <button
                      type="button"
                      onClick={() => void choose(suggestion)}
                      disabled={resolving !== null}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 py-3.5 text-left transition-colors duration-fast hover:bg-sunken/60",
                        resolving === suggestion.id && "opacity-60",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="font-display block truncate text-[1.1875rem] leading-tight">{suggestion.primary}</span>
                        {suggestion.secondary ? (
                          <span className="mt-1 block truncate text-sm text-soft">{suggestion.secondary}</span>
                        ) : null}
                      </span>
                      {resolving === suggestion.id ? (
                        <span className="font-micro shrink-0 text-[0.75rem] text-soft">Abrindo…</span>
                      ) : null}
                    </button>
                  </li>
                ))}
          </ul>
          {source === "google" && items.length > 0 ? (
            <p className="text-right">
              <GoogleAttribution />
            </p>
          ) : null}
          {!suggestions.isPending && items.length === 0 ? (
            <p className="text-sm text-soft">Nenhum restaurante com esse nome por aqui.</p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col items-start gap-2 border-t border-rule pt-5">
        <p className="text-sm text-soft">Não achou? Dá para preencher tudo à mão.</p>
        <Button variant="secondary" onClick={manual}>
          <PenLine aria-hidden />
          Cadastrar à mão
        </Button>
      </div>
    </div>
  );
}
