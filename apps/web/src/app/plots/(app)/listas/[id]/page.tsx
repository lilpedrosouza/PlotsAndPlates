import type { Metadata } from "next";
import { Suspense } from "react";
import { ListPage, ListSkeleton } from "@/components/plots/list-page";

export const metadata: Metadata = { title: "Lista" };

/** Casca estática preenchida no navegador depois do login; o id é lido no cliente. */
export const instant = false;

export default function ListRoute() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <ListPage />
    </Suspense>
  );
}
