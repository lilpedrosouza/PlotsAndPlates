import type { Metadata } from "next";
import { Suspense } from "react";
import { Notebook, NotebookSkeleton } from "@/components/plates/notebook";

export const metadata: Metadata = { title: "Quero ir" };

/** Casca estática preenchida no navegador depois do login. */
export const instant = false;

export default function WishlistPage() {
  return (
    <Suspense fallback={<NotebookSkeleton />}>
      <Notebook status="quero-ir" />
    </Suspense>
  );
}
