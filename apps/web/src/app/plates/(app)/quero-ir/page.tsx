import type { Metadata } from "next";
import { Suspense } from "react";
import { Notebook, NotebookFallback } from "@/components/plates/notebook";

export const metadata: Metadata = { title: "Quero ir" };

/** Casca estática preenchida no navegador depois do login. */
export const instant = false;

export default function WishlistPage() {
  return (
    <Suspense fallback={<NotebookFallback status="quero-ir" />}>
      <Notebook status="quero-ir" />
    </Suspense>
  );
}
