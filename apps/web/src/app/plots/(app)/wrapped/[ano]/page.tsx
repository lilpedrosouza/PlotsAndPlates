import type { Metadata } from "next";
import { Suspense } from "react";
import { WrappedPlayer } from "@/components/wrapped/wrapped-player";

export const metadata: Metadata = { title: "PAP Wrapped" };

/** Casca estática preenchida no navegador depois do login; o ano é lido no cliente. */
export const instant = false;

export default function WrappedRoute() {
  return (
    <Suspense fallback={<div className="fixed inset-0 z-[70] bg-black" />}>
      <WrappedPlayer />
    </Suspense>
  );
}
