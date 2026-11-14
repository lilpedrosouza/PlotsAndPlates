import type { Metadata } from "next";
import { PeopleSearch } from "@/components/people/people-search";

export const metadata: Metadata = { title: "Pessoas" };

/** Casca estática preenchida no navegador depois do login. */
export const instant = false;

export default function PeoplePage() {
  return <PeopleSearch />;
}
