import type { Metadata } from "next";
import { Suspense } from "react";
import { TitlePage, TitleSkeleton } from "@/components/plots/title-page";

export const metadata: Metadata = { title: "Título" };

/** Casca estática preenchida no navegador depois do login; o id é lido no cliente. */
export const instant = false;

export default function TitleRoute() {
  return (
    <Suspense fallback={<TitleSkeleton />}>
      <TitlePage />
    </Suspense>
  );
}
