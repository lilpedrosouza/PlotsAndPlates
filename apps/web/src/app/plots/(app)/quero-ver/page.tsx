import type { Metadata } from "next";
import { Watchlist } from "@/components/plots/watchlist";

export const metadata: Metadata = { title: "Quero ver" };

/** Casca estática preenchida no navegador depois do login. */
export const instant = false;

export default function WatchlistPage() {
  return <Watchlist />;
}
