import type { Metadata } from "next";
import { Search } from "@/components/plots/search";

export const metadata: Metadata = { title: "Buscar" };

/** Casca estática preenchida no navegador depois do login. */
export const instant = false;

export default function SearchPage() {
  return <Search />;
}
