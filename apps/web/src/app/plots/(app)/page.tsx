import { InviteBanner } from "@/components/couple/invite-banner";
import { Diary } from "@/components/plots/diary";
import { WrappedBanner } from "@/components/wrapped/wrapped-card";

/** Casca estática preenchida no navegador depois do login: não há o que validar no servidor. */
export const instant = false;

export default function PlotsPage() {
  return (
    <>
      <InviteBanner />
      <WrappedBanner />
      <Diary />
    </>
  );
}
