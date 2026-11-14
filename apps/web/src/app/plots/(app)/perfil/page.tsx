import type { Metadata } from "next";
import { FavoritesEditor } from "@/components/plots/favorites-editor";
import { ProfileEditor } from "@/components/profile/profile-editor";

export const metadata: Metadata = { title: "Perfil" };

/** Casca estática preenchida no navegador depois do login: não há o que validar no servidor. */
export const instant = false;

export default function PerfilPage() {
  return (
    <div className="flex flex-col gap-8 pt-2">
      <FavoritesEditor />
      <ProfileEditor />
    </div>
  );
}
