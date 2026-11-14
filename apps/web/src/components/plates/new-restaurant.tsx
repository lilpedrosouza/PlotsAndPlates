"use client";

import type { RestaurantDraft } from "@pap/shared";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiRequestError } from "@/lib/api";
import { useCreateRestaurant } from "@/lib/plates/mutations";
import { PlaceSearch } from "./place-search";
import { RestaurantForm, type RestaurantFormSubmit } from "./restaurant-form";

/**
 * Cadastro: busca (Google, OpenStreetMap ou link do Maps) → rótulo em branco
 * com o que deu para preencher → "Já fomos" ou "Quero ir".
 */
export function NewRestaurant() {
  const router = useRouter();
  // Um token por cadastro agrupa as buscas do Google numa sessão só (cobrança menor).
  const [session] = useState(() => crypto.randomUUID());
  const [draft, setDraft] = useState<RestaurantDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const create = useCreateRestaurant();

  const submit = ({ fields, destination, wishlist }: RestaurantFormSubmit) => {
    setError(null);
    create.mutate(
      { ...fields, destination, ...(destination === "quero-ir" ? { wishlist } : {}) },
      {
        onSuccess: ({ id }) => router.push(destination === "fomos" ? `/plates/r/${id}?avaliar=1` : `/plates/r/${id}`),
        onError: (failure) => {
          if (failure instanceof ApiRequestError && failure.code === "restaurant_exists" && failure.fields.id) {
            router.push(`/plates/r/${failure.fields.id}`);
            return;
          }
          setError(failure instanceof Error ? failure.message : "Não deu para salvar. Tenta de novo?");
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-6 pt-2 pb-8">
      <header className="flex flex-col gap-3">
        {draft ? (
          <Button variant="quiet" size="sm" className="-ml-3 self-start" onClick={() => setDraft(null)}>
            <ArrowLeft aria-hidden />
            Voltar para a busca
          </Button>
        ) : null}
        <h1 className="font-display text-[clamp(2rem,8vw,3rem)] leading-[1.05]">
          {draft ? "Confere o rótulo" : "Onde a gente foi?"}
        </h1>
        <p className="max-w-[48ch] text-soft">
          {draft
            ? draft.source === "manual"
              ? "Preenche o que souber; dá para completar depois."
              : "Já veio o que deu para achar. Ajusta o que estiver diferente."
            : "Busque pelo nome ou cole o link do Google Maps."}
        </p>
      </header>

      {draft ? (
        <RestaurantForm
          initial={draft.fields}
          mode="create"
          osmAttribution={draft.osmAttribution}
          busy={create.isPending}
          error={error}
          onSubmit={submit}
          onCancel={() => setDraft(null)}
        />
      ) : (
        <PlaceSearch session={session} onDraft={(next) => setDraft(next)} onExisting={(id) => router.push(`/plates/r/${id}`)} />
      )}
    </div>
  );
}
