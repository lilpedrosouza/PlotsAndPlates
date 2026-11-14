"use client";

import type { AccentKey } from "@pap/shared";
import { useSection } from "@/components/shell/section-context";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type BilledPerson = {
  name: string;
  avatarUrl: string | null;
  accent?: AccentKey;
  /** Texto no letreiro, quando difere do nome (ex.: "@bia?" num convite). */
  label?: string;
};

/**
 * O casal como letreiro. Em Plates, "mesa para dois" do cardápio: os nomes
 * ligados por um "&" em itálico e os avatares sobrepostos como dois carimbos.
 * Em Plots, a linha de faturamento do cartaz: "Estrelando" e os dois nomes em
 * caixa alta, avatares quadrados encostados. `pending` deixa o segundo nome em
 * tinta suave (convite ainda sem resposta).
 */
export function CoupleBilling({ left, right, pending = false, className }: { left: BilledPerson; right: BilledPerson; pending?: boolean; className?: string }) {
  const section = useSection();
  const avatars = (
    <span aria-hidden className="flex shrink-0">
      <Avatar name={left.name} src={left.avatarUrl} size={section === "plates" ? 56 : 48} className={cn(section === "plates" && "ring-4 ring-background")} />
      <Avatar
        name={right.name}
        src={right.avatarUrl}
        size={section === "plates" ? 56 : 48}
        accent={right.accent}
        world={section}
        className={cn(section === "plates" ? "-ml-4 ring-4 ring-background" : "border-l border-background", pending && "opacity-45 grayscale")}
      />
    </span>
  );

  if (section === "plates") {
    return (
      <div className={cn("flex items-center gap-4", className)}>
        {avatars}
        <p className="font-display min-w-0 text-[1.625rem] leading-[1.1] text-balance">
          {left.name}{" "}
          <span aria-label="e" className="text-[2.125rem] leading-none text-brand italic">
            &amp;
          </span>{" "}
          <span className={cn(pending && "text-soft")}>{right.label ?? right.name}</span>
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3.5", className)}>
      {avatars}
      <p className="min-w-0 leading-tight">
        <span className="font-micro mr-2 text-[0.6875rem] tracking-[0.18em] text-soft uppercase">Estrelando</span>
        <span className="font-display text-[1.25rem] tracking-[0.04em] uppercase">
          {left.name} <span className="text-[0.875rem] text-soft">e</span>{" "}
          <span
            {...(right.accent && !pending ? { "data-theme": section, "data-accent": right.accent } : {})}
            className={cn(pending ? "text-soft" : "text-brand")}
          >
            {right.label ?? right.name}
          </span>
        </span>
      </p>
    </div>
  );
}
