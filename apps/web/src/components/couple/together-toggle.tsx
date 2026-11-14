"use client";

import type { PublicProfile } from "@pap/shared";
import { useSection } from "@/components/shell/section-context";
import { Avatar } from "@/components/ui/avatar";
import { ChipToggle } from "@/components/ui/chip";
import { firstName } from "./added-by";

/** "Fomos juntos" / "Vimos juntos": a visita ou sessão aparece também para o par. */
export function TogetherToggle({ partner, label, value, onChange, where }: { partner: PublicProfile; label: string; value: boolean; onChange: (value: boolean) => void; where: string }) {
  const section = useSection();
  const name = firstName(partner.displayName);
  return (
    <div className="flex flex-col items-start gap-1.5">
      <ChipToggle pressed={value} onPressedChange={onChange}>
        {label}
        <span aria-hidden className="-mr-1 ml-1 flex">
          <Avatar name={partner.displayName} src={partner.avatarUrl} size={20} accent={partner.accent} world={section} />
        </span>
      </ChipToggle>
      <p className="text-sm text-soft">{value ? `Aparece no ${where} de ${name} também.` : `Fica só no seu ${where}.`}</p>
    </div>
  );
}
