"use client";

import {
  CUISINES,
  PRICE_LEVELS,
  type RestaurantInput,
  WISHLIST_PRIORITIES,
  WISHLIST_PRIORITY_LABELS,
  type WishlistPriority,
  cuisineLabel,
  restaurantInputSchema,
} from "@pap/shared";
import dynamic from "next/dynamic";
import { type FormEvent, Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChipToggle } from "@/components/ui/chip";
import { TextAreaField, TextField } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { priceLabel } from "@/lib/plates/format";
import { cn } from "@/lib/utils";
import { ArchPhoto } from "./arch-photo";
import { OsmAttribution } from "./attribution";
import { PhotoButton, usePhotoUpload } from "./photo-picker";

/** O MapLibre só é baixado quando o formulário aparece. */
const PinPicker = dynamic(() => import("./pin-picker"), {
  ssr: false,
  loading: () => <Skeleton className="h-56 w-full rounded-md" />,
});

export type Destination = "fomos" | "quero-ir";

export type RestaurantFormSubmit = {
  fields: RestaurantInput;
  destination: Destination;
  wishlist: { reason: string; priority: WishlistPriority };
};

const COMMON_CUISINES = 14;
const MAX_CUISINES = 5;

/**
 * Formulário do restaurante: o rótulo em branco sendo preenchido. Serve ao
 * cadastro (com o destino "Já fomos" / "Quero ir") e à edição.
 */
export function RestaurantForm({
  initial,
  coverUrl,
  mode,
  osmAttribution,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  initial: RestaurantInput;
  coverUrl?: string | null;
  mode: "create" | "edit";
  osmAttribution?: boolean;
  busy?: boolean;
  error?: string | null;
  onSubmit: (value: RestaurantFormSubmit) => void;
  onCancel?: () => void;
}) {
  const [fields, setFields] = useState<RestaurantInput>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [destination, setDestination] = useState<Destination>("fomos");
  const [reason, setReason] = useState("");
  const [priority, setPriority] = useState<WishlistPriority>("media");
  const [allCuisines, setAllCuisines] = useState(false);
  const cover = usePhotoUpload("restaurant");

  const set = (patch: Partial<RestaurantInput>) => setFields((current) => ({ ...current, ...patch }));
  const cuisines = fields.cuisines ?? [];
  const toggleCuisine = (key: string, on: boolean) =>
    set({ cuisines: on ? [...cuisines, key].slice(0, MAX_CUISINES) : cuisines.filter((item) => item !== key) });
  const shownCuisines = allCuisines ? CUISINES : CUISINES.slice(0, COMMON_CUISINES);
  const extraCuisines = cuisines.filter((key) => !shownCuisines.some((cuisine) => cuisine.key === key));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = restaurantInputSchema.safeParse(fields);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[issue.path.join(".")] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    onSubmit({ fields, destination, wishlist: { reason, priority } });
  };

  const text = (key: keyof RestaurantInput) => ({
    value: (fields[key] as string | undefined) ?? "",
    onChange: (event: { target: { value: string } }) => set({ [key]: event.target.value } as Partial<RestaurantInput>),
    error: errors[key],
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-8">
      <section className="frame-label bg-surface p-4 sm:grid sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-6">
        <div className="relative mx-auto w-full max-w-[16rem]">
          <ArchPhoto
            src={cover.preview ?? coverUrl ?? null}
            alt={fields.name ? `Foto de ${fields.name}` : "Foto do restaurante"}
            sizes="16rem"
          />
          <PhotoButton
            label={cover.preview || coverUrl ? "Trocar foto" : "Pôr foto"}
            busy={cover.busy}
            className="absolute bottom-3 left-1/2 -translate-x-1/2"
            onFile={async ([file]) => {
              if (!file) return;
              const path = await cover.upload(file);
              if (path) set({ coverPath: path });
            }}
          />
        </div>
        {cover.error ? (
          <p role="alert" className="mt-2 text-sm font-medium text-danger">
            {cover.error}
          </p>
        ) : null}
        <div className="rule-double mt-5 flex flex-col gap-5 pt-5 sm:mt-0">
          <TextField label="Nome" {...text("name")} autoComplete="off" maxLength={80} required />
          <TextField label="Endereço" {...text("address")} autoComplete="off" maxLength={160} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Bairro" {...text("neighborhood")} autoComplete="off" maxLength={60} />
            <TextField label="Cidade" {...text("city")} autoComplete="off" maxLength={60} />
          </div>
        </div>
      </section>

      <fieldset className="flex flex-col gap-3">
        <legend className="font-micro mb-3 text-[0.8125rem] text-soft">Onde fica no mapa</legend>
        {/* O mapa só existe no navegador: o Suspense segura a renderização no servidor. */}
        <Suspense fallback={<Skeleton className="h-56 w-full rounded-md" />}>
          <PinPicker
            lat={fields.lat}
            lng={fields.lng}
            onChange={(point) => set({ lat: Number(point.lat.toFixed(6)), lng: Number(point.lng.toFixed(6)) })}
          />
        </Suspense>
        <p className="text-sm text-soft">
          {fields.lat != null ? "Arraste o pin se ele não estiver no lugar certo." : "Toque no mapa para marcar o restaurante."}
        </p>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="font-micro mb-3 flex w-full justify-between text-[0.8125rem] text-soft">
          <span>Cozinha</span>
          <span>
            {cuisines.length}/{MAX_CUISINES}
          </span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {extraCuisines.map((key) => (
            <ChipToggle key={key} pressed onPressedChange={() => toggleCuisine(key, false)}>
              {cuisineLabel(key)}
            </ChipToggle>
          ))}
          {shownCuisines.map((cuisine) => (
            <ChipToggle
              key={cuisine.key}
              pressed={cuisines.includes(cuisine.key)}
              disabled={!cuisines.includes(cuisine.key) && cuisines.length >= MAX_CUISINES}
              onPressedChange={(on) => toggleCuisine(cuisine.key, on)}
            >
              {cuisine.label}
            </ChipToggle>
          ))}
          {allCuisines ? null : (
            <Button variant="quiet" size="sm" onClick={() => setAllCuisines(true)}>
              Ver todas
            </Button>
          )}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="font-micro mb-3 text-[0.8125rem] text-soft">Faixa de preço</legend>
        <div className="flex flex-wrap gap-2">
          {PRICE_LEVELS.map((level) => (
            <ChipToggle
              key={level}
              pressed={fields.priceLevel === level}
              onPressedChange={(on) => set({ priceLevel: on ? level : null })}
            >
              <span aria-label={`Faixa ${level} de 4`}>{priceLabel(level)}</span>
            </ChipToggle>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Telefone" {...text("phone")} inputMode="tel" autoComplete="off" maxLength={30} />
        <TextField label="Site" {...text("website")} inputMode="url" placeholder="https://" autoComplete="off" />
      </div>
      <TextAreaField
        label="Horário de funcionamento"
        {...text("openingHours")}
        hint="Do jeito que fizer sentido: “ter a dom, 12h às 23h”."
        maxLength={300}
        className="[&_textarea]:min-h-16"
      />
      <TextAreaField label="Descrição" {...text("description")} maxLength={1000} />

      {osmAttribution ? <OsmAttribution /> : null}

      {mode === "create" ? (
        <fieldset className="flex flex-col gap-4 border-t border-rule-strong pt-6">
          <legend className="font-display float-left mb-4 w-full text-2xl leading-tight">E aí, já foram?</legend>
          <div role="radiogroup" aria-label="Destino" className="grid grid-cols-2 gap-3">
            {(
              [
                ["fomos", "Já fomos", "Registra a visita de hoje e abre a avaliação."],
                ["quero-ir", "Quero ir", "Guarda na lista para um dia desses."],
              ] as const
            ).map(([value, title, hint]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={destination === value}
                onClick={() => setDestination(value)}
                className={cn(
                  "flex flex-col items-start gap-1.5 rounded-md border p-4 text-left transition-colors duration-fast",
                  destination === value
                    ? "border-foreground bg-foreground text-background"
                    : "border-rule-strong hover:bg-sunken",
                )}
              >
                <span className="font-display text-xl leading-tight">{title}</span>
                <span className={cn("text-sm leading-snug", destination === value ? "text-background/80" : "text-soft")}>
                  {hint}
                </span>
              </button>
            ))}
          </div>
          {destination === "quero-ir" ? (
            <div className="flex flex-col gap-5">
              <TextField
                label="Por que a gente quer ir"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={300}
                placeholder="Indicação da Bia, vimos no Instagram…"
              />
              <fieldset className="flex flex-col gap-3">
                <legend className="font-micro mb-3 text-[0.8125rem] text-soft">Prioridade</legend>
                <div className="flex gap-2">
                  {WISHLIST_PRIORITIES.map((value) => (
                    <ChipToggle key={value} pressed={priority === value} onPressedChange={() => setPriority(value)}>
                      {WISHLIST_PRIORITY_LABELS[value]}
                    </ChipToggle>
                  ))}
                </div>
              </fieldset>
            </div>
          ) : null}
        </fieldset>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button variant="quiet" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" busy={busy} disabled={cover.busy}>
          {mode === "edit" ? "Salvar" : destination === "fomos" ? "Salvar e avaliar" : "Guardar no quero ir"}
        </Button>
      </div>
    </form>
  );
}
