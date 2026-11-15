import { Suspense } from "react";
import { InviteBanner } from "@/components/couple/invite-banner";
import { Notebook, NotebookFallback } from "@/components/plates/notebook";
import { WrappedBanner } from "@/components/wrapped/wrapped-card";

/** Casca estática preenchida no navegador depois do login: não há o que validar no servidor. */
export const instant = false;

export default function PlatesPage() {
  return (
    <>
      <InviteBanner />
      <WrappedBanner />
      <Suspense fallback={<NotebookFallback status="fomos" />}>
        <Notebook status="fomos" />
      </Suspense>
    </>
  );
}
