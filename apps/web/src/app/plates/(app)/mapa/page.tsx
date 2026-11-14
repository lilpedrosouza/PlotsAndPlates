import type { Metadata } from "next";
import { MapScreen } from "@/components/plates/map-screen";

export const metadata: Metadata = { title: "Mapa" };

/** Casca estática preenchida no navegador depois do login. */
export const instant = false;

export default function MapPage() {
  return <MapScreen />;
}
