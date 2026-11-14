"use client";

import { CUISINES, PRICE_LEVELS, type RestaurantSort, cuisineLabel, formatRating } from "@pap/shared";
import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChipToggle } from "@/components/ui/chip";
import { TextField } from "@/components/ui/field";
import { type NotebookFilters, activeFilterCount } from "@/lib/plates/filters";
import { priceLabel } from "@/lib/plates/format";
import { Sheet } from "./sheet";

const SORT_LABELS: Record<RestaurantSort, string> = {
  recentes: "Mais recentes",
  nota: "Maior nota",
  nome: "Nome",
  prioridade: "Prioridade",
};
const MIN_RATINGS = [3, 3.5, 4, 4.5];
/** As cozinhas mais comuns aparecem primeiro; as outras ficam atrás de "ver todas". */
const COMMON_CUISINES = 12;

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="font-micro mb-2.5 text-[0.8125rem] text-soft">{title}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

export function FiltersSheet({
  open,
  onOpenChange,
  filters,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: NotebookFilters;
  onApply: (filters: NotebookFilters) => void;
}) {
  const [draft, setDraft] = useState(filters);
  const [allCuisines, setAllCuisines] = useState(false);
  const set = (patch: Partial<NotebookFilters>) => setDraft((current) => ({ ...current, ...patch }));
  const sorts: RestaurantSort[] = draft.status === "quero-ir" ? ["prioridade", "recentes", "nome"] : ["recentes", "nota", "nome"];
  const cuisines = allCuisines ? CUISINES : CUISINES.slice(0, COMMON_CUISINES);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(filters);
        onOpenChange(next);
      }}
      title="Filtros"
      footer={
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
          <Button
            variant="secondary"
            onClick={() => setDraft({ status: draft.status, sort: draft.sort })}
            disabled={activeFilterCount(draft) === 0}
          >
            Limpar
          </Button>
          <Button
            block
            onClick={() => {
              onApply(draft);
              onOpenChange(false);
            }}
          >
            Mostrar resultados
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-7">
        <Group title="Ordem">
          {sorts.map((sort) => (
            <ChipToggle key={sort} pressed={draft.sort === sort} onPressedChange={() => set({ sort })}>
              {SORT_LABELS[sort]}
            </ChipToggle>
          ))}
        </Group>

        <TextField
          label="Bairro ou cidade"
          value={draft.area ?? ""}
          onChange={(event) => set({ area: event.target.value || undefined })}
          placeholder="Pinheiros, São Paulo…"
          autoComplete="off"
        />

        <Group title="Cozinha">
          {draft.cuisine && !cuisines.some((cuisine) => cuisine.key === draft.cuisine) ? (
            <ChipToggle pressed onPressedChange={() => set({ cuisine: undefined })}>
              {cuisineLabel(draft.cuisine)}
            </ChipToggle>
          ) : null}
          {cuisines.map((cuisine) => (
            <ChipToggle
              key={cuisine.key}
              pressed={draft.cuisine === cuisine.key}
              onPressedChange={(pressed) => set({ cuisine: pressed ? cuisine.key : undefined })}
            >
              {cuisine.label}
            </ChipToggle>
          ))}
          {allCuisines ? null : (
            <Button variant="quiet" size="sm" onClick={() => setAllCuisines(true)}>
              Ver todas
            </Button>
          )}
        </Group>

        <Group title="Preço">
          {PRICE_LEVELS.map((level) => (
            <ChipToggle
              key={level}
              pressed={draft.price === level}
              onPressedChange={(pressed) => set({ price: pressed ? level : undefined })}
            >
              <span aria-label={`Faixa de preço ${level} de 4`}>{priceLabel(level)}</span>
            </ChipToggle>
          ))}
        </Group>

        {draft.status === "quero-ir" ? null : (
          <Group title="Nota mínima">
            {MIN_RATINGS.map((rating) => (
              <ChipToggle
                key={rating}
                pressed={draft.minRating === rating}
                onPressedChange={(pressed) => set({ minRating: pressed ? rating : undefined })}
              >
                {formatRating(rating)}+
              </ChipToggle>
            ))}
          </Group>
        )}
      </div>
    </Sheet>
  );
}

/** Etiquetas dos filtros ligados, cada uma com um × para tirar. */
export function ActiveFilters({ filters, onChange }: { filters: NotebookFilters; onChange: (filters: NotebookFilters) => void }) {
  const items = [
    filters.cuisine ? { key: "cuisine", label: cuisineLabel(filters.cuisine) } : null,
    filters.area ? { key: "area", label: filters.area } : null,
    filters.price ? { key: "price", label: priceLabel(filters.price) } : null,
    filters.minRating ? { key: "minRating", label: `Nota ${formatRating(filters.minRating)}+` } : null,
  ].filter((item) => item !== null);
  if (items.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-2" aria-label="Filtros ligados">
      {items.map((item) => (
        <li key={item.key}>
          <button
            type="button"
            onClick={() => onChange({ ...filters, [item.key]: undefined })}
            aria-label={`Tirar filtro ${item.label}`}
            className="inline-flex h-10 items-center gap-1.5 rounded-md bg-foreground px-3.5 text-sm font-semibold text-background transition-opacity duration-fast hover:opacity-85"
          >
            {item.label}
            <X aria-hidden className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
