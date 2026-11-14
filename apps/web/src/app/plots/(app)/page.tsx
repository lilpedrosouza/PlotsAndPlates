import { PlotsHome } from "@/components/home/plots-home";

/** Casca estática preenchida no navegador depois do login: não há o que validar no servidor. */
export const instant = false;

export default function PlotsPage() {
  return <PlotsHome />;
}
