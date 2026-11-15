"use client";

import { cuisineLabel, formatRating } from "@pap/shared";
import { X } from "lucide-react";
import type { NotebookFilters } from "@/lib/plates/filters";
import { priceLabel } from "@/lib/plates/format";

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
