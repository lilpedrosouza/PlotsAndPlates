import type { Metadata } from "next";
import { ProfileEditor } from "@/components/profile/profile-editor";

export const metadata: Metadata = { title: "Perfil" };

/** Casca estática preenchida no navegador depois do login: não há o que validar no servidor. */
export const instant = false;

export default function PerfilPage() {
  return <ProfileEditor />;
}
