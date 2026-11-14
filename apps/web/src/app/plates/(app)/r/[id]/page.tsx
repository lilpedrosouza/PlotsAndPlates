import type { Metadata } from "next";
import { Suspense } from "react";
import { RestaurantPage, RestaurantSkeleton } from "@/components/plates/restaurant-page";

export const metadata: Metadata = { title: "Restaurante" };

/** Casca estática preenchida no navegador depois do login; o id é lido no cliente. */
export const instant = false;

export default function RestaurantRoute() {
  return (
    <Suspense fallback={<RestaurantSkeleton />}>
      <RestaurantPage />
    </Suspense>
  );
}
