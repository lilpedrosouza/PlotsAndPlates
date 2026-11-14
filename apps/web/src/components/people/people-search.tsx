"use client";

import { Search as SearchIcon } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { useSection } from "@/components/shell/section-context";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { usePartner } from "@/lib/couple/queries";
import { usePeopleSearch } from "@/lib/people/queries";
import { cn } from "@/lib/utils";

/** Busca de pessoas por nome ou @username. Sem feed nem seguidores: só achar e ver o perfil. */
export function PeopleSearch() {
  const section = useSection();
  const inputId = useId();
  const [q, setQ] = useState("");
  const search = usePeopleSearch(q);
  const partner = usePartner();
  const term = q.trim().replace(/^@/, "");
  const people = search.data ?? [];

  return (
    <div className="flex flex-col gap-6 pt-2 pb-20 md:pb-8">
      <h1 className="font-display text-[clamp(2.25rem,10vw,4rem)] leading-[1.14]">Pessoas</h1>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="font-micro text-[0.8125rem] text-soft">
          Nome ou @username
        </label>
        <div className="relative">
          <SearchIcon aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-soft" />
          <input
            id={inputId}
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="ana, @bia…"
            className={cn(
              "font-display h-16 w-full rounded-md border border-rule-strong pr-4 pl-12 text-[1.25rem] text-foreground outline-none transition-colors duration-fast placeholder:text-soft focus-visible:border-brand",
              "plates:bg-surface plots:bg-sunken",
            )}
          />
        </div>
      </div>

      {term.length < 2 ? (
        <p className="max-w-[52ch] leading-relaxed text-soft">
          Ache alguém para ver o perfil e as avaliações públicas. No PAP não tem feed nem seguidores: cada um cuida do seu diário.
        </p>
      ) : search.isPending ? (
        <div aria-busy className="flex flex-col gap-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : search.isError ? (
        <p role="alert" className="text-soft">
          {search.error instanceof Error ? search.error.message : "A busca não respondeu agora."}
        </p>
      ) : people.length === 0 ? (
        <p className="text-soft">Ninguém com esse nome ou @username.</p>
      ) : (
        <ul className={cn("flex flex-col transition-opacity duration-fast", search.isPlaceholderData && "opacity-60")}>
          {people.map((person) => (
            <li key={person.id}>
              <Link
                href={`/${section}/u/${person.username}`}
                className="flex items-center gap-3.5 border-b border-rule py-3 transition-colors duration-fast hover:bg-sunken/70"
              >
                <Avatar name={person.displayName} src={person.avatarUrl} size={40} accent={person.accent} world={section} />
                <span className="min-w-0 flex-1">
                  <span className="font-display block truncate text-[1.125rem] leading-tight">{person.displayName}</span>
                  <span className="font-micro mt-0.5 block text-[0.75rem] text-soft">@{person.username}</span>
                </span>
                {partner?.id === person.id ? (
                  <span className="font-micro border border-rule-strong px-2 py-0.5 text-[0.6875rem] text-foreground">seu par</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
