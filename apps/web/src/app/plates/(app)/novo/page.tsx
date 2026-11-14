import type { Metadata } from "next";
import { NewRestaurant } from "@/components/plates/new-restaurant";

export const metadata: Metadata = { title: "Novo restaurante" };

/** Casca estática preenchida no navegador depois do login. */
export const instant = false;

export default function NewRestaurantPage() {
  return <NewRestaurant />;
}
