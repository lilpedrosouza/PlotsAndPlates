"use client";

import type { PersonRef } from "@pap/shared";
import { useSection } from "@/components/shell/section-context";
import { Avatar } from "@/components/ui/avatar";
import { usePartner } from "@/lib/couple/queries";
import { useMe } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

/**
 * "Adicionado por" num item do quero ir / quero ver do casal: mini-avatares e
 * "por Bia", "por você" ou "pelos dois". Sem par, tudo é seu: não mostra nada.
 */
export function AddedBy({ people, className }: { people: PersonRef[]; className?: string }) {
  const section = useSection();
  const meId = useMe().data?.profile?.id;
  const partner = usePartner();
  const onlyMine = people.every((person) => person.id === meId);
  if (people.length === 0 || (onlyMine && !partner)) return null;
  const label =
    people.length > 1 ? "pelos dois" : people[0]?.id === meId ? "por você" : `por ${firstName(people[0]?.displayName ?? "")}`;
  return (
    <p className={cn("font-micro flex items-center gap-1.5 text-[0.6875rem] text-soft", className)}>
      <span aria-hidden className="flex">
        {people.map((person, index) => (
          <Avatar
            key={person.id}
            name={person.displayName}
            src={person.avatarUrl}
            size={16}
            accent={person.id === meId ? undefined : person.accent}
            world={section}
            className={cn(index > 0 && "-ml-1.5 ring-1 ring-surface")}
          />
        ))}
      </span>
      <span>
        <span className="sr-only">Adicionado </span>
        {label}
      </span>
    </p>
  );
}
