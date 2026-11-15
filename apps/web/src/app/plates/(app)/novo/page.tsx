import { Suspense } from "react";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import type { Metadata } from "next";
import { NewRestaurant } from "@/components/plates/new-restaurant";

export const metadata: Metadata = { title: "Novo restaurante" };

/** Casca estática preenchida no navegador depois do login. */
export const instant = false;

export default function NewRestaurantPage() {
  // O formulário monta só no navegador (busca de lugar e mapa).
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewRestaurant />
    </Suspense>
  );
}
