import type { Metadata } from "next";
import { Lists } from "@/components/plots/lists";

export const metadata: Metadata = { title: "Listas" };

/** Casca estática preenchida no navegador depois do login. */
export const instant = false;

export default function ListsPage() {
  return <Lists />;
}
