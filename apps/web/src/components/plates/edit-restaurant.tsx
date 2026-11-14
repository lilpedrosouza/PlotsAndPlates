"use client";

import type { RestaurantInput } from "@pap/shared";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useDeleteRestaurant, useUpdateRestaurant } from "@/lib/plates/mutations";
import { useRestaurant } from "@/lib/plates/queries";
import { RestaurantForm } from "./restaurant-form";
import { RestaurantSkeleton } from "./restaurant-page";

/** Edição do restaurante (só quem cadastrou) e a exclusão, no fim. */
export function EditRestaurant() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const query = useRestaurant(id);
  const update = useUpdateRestaurant(id);
  const remove = useDeleteRestaurant(id);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (query.isPending) return <RestaurantSkeleton />;
  const restaurant = query.data;
  if (!restaurant || !restaurant.canEdit) {
    return (
      <div className="flex flex-col items-start gap-4 pt-6">
        <h1 className="font-display text-3xl leading-tight">Só quem cadastrou edita</h1>
        <p className="max-w-[44ch] text-soft">Os dados deste restaurante são de quem o cadastrou. Você continua podendo avaliar e registrar visitas.</p>
        <Link href={`/plates/r/${id}`} className={buttonVariants({ variant: "secondary" })}>
          Voltar ao restaurante
        </Link>
      </div>
    );
  }

  const initial: RestaurantInput = {
    name: restaurant.name,
    address: restaurant.address,
    neighborhood: restaurant.neighborhood,
    city: restaurant.city,
    lat: restaurant.lat,
    lng: restaurant.lng,
    phone: restaurant.phone,
    website: restaurant.website,
    openingHours: restaurant.openingHours,
    priceLevel: restaurant.priceLevel,
    cuisines: restaurant.cuisines,
    description: restaurant.description,
  };

  return (
    <div className="flex flex-col gap-6 pt-2 pb-24">
      <h1 className="font-display text-[clamp(2rem,8vw,3rem)] leading-[1.05]">Editar rótulo</h1>
      <RestaurantForm
        initial={initial}
        coverUrl={restaurant.coverUrl}
        mode="edit"
        osmAttribution={Boolean(restaurant.osmRef)}
        busy={update.isPending}
        error={error}
        onCancel={() => router.push(`/plates/r/${id}`)}
        onSubmit={({ fields }) => {
          setError(null);
          // Os ids do Google e do OpenStreetMap não mudam na edição.
          const patch = { ...fields };
          delete patch.googlePlaceId;
          delete patch.osmRef;
          update.mutate(patch, {
            onSuccess: () => router.push(`/plates/r/${id}`),
            onError: (failure) => setError(failure instanceof Error ? failure.message : "Não deu para salvar."),
          });
        }}
      />
      <section className="flex flex-col items-start gap-3 border-t border-rule-strong pt-6">
        <h2 className="font-display text-xl leading-tight">Apagar restaurante</h2>
        <p className="max-w-[52ch] text-sm text-soft">
          Apaga o restaurante, os pratos, as suas visitas e as suas notas. Não dá para desfazer. Se outras pessoas já registraram visitas ou notas aqui, ele não pode ser apagado.
        </p>
        <Button
          variant="danger"
          busy={remove.isPending}
          onClick={() => {
            if (!window.confirm(`Apagar ${restaurant.name} de vez?`)) return;
            setDeleteError(null);
            remove.mutate(undefined, {
              onSuccess: () => router.push("/plates"),
              onError: (failure) => setDeleteError(failure instanceof Error ? failure.message : "Não deu para apagar."),
            });
          }}
        >
          Apagar restaurante
        </Button>
        {deleteError ? (
          <p role="alert" className="max-w-[52ch] text-sm font-medium text-danger">
            {deleteError}
          </p>
        ) : null}
      </section>
    </div>
  );
}
