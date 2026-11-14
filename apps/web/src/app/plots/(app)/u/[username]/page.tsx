import type { Metadata } from "next";
import { Suspense } from "react";
import { PlotsPublicProfile, PublicProfileSkeleton } from "@/components/people/public-profile";

export const metadata: Metadata = { title: "Perfil" };

/** Casca estática preenchida no navegador depois do login; o @ é lido no cliente. */
export const instant = false;

export default function PublicProfileRoute() {
  return (
    <Suspense fallback={<PublicProfileSkeleton />}>
      <PlotsPublicProfile />
    </Suspense>
  );
}
