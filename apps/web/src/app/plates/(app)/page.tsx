import { Suspense } from "react";
import { Notebook, NotebookSkeleton } from "@/components/plates/notebook";

/** Casca estática preenchida no navegador depois do login: não há o que validar no servidor. */
export const instant = false;

export default function PlatesPage() {
  return (
    <Suspense fallback={<NotebookSkeleton />}>
      <Notebook status="fomos" />
    </Suspense>
  );
}
