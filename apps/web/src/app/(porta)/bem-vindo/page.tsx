import type { Metadata } from "next";
import { Onboarding } from "@/components/auth/onboarding";

export const metadata: Metadata = { title: "Primeiro acesso" };

export default function BemVindoPage() {
  return <Onboarding />;
}
