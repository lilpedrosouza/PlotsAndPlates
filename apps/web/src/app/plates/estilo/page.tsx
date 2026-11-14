import type { Metadata } from "next";
import { StyleGuide } from "@/components/estilo/style-guide";

export const metadata: Metadata = { title: "Guia de estilo" };

export default function EstiloPage() {
  return <StyleGuide />;
}
