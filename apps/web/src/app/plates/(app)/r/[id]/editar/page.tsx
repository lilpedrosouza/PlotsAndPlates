import type { Metadata } from "next";
import { Suspense } from "react";
import { EditRestaurant } from "@/components/plates/edit-restaurant";
import { RestaurantSkeleton } from "@/components/plates/restaurant-page";

export const metadata: Metadata = { title: "Editar restaurante" };

/** Casca estática preenchida no navegador depois do login. */
export const instant = false;

export default function EditRestaurantRoute() {
  return (
    <Suspense fallback={<RestaurantSkeleton />}>
      <EditRestaurant />
    </Suspense>
  );
}
