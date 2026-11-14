"use client";

import type { CustomList } from "@pap/shared";
import { Lock } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateList } from "@/lib/plots/mutations";
import { useLists } from "@/lib/plots/queries";
import { Poster } from "./poster";

/** Capa da lista: até quatro pôsteres em leque, de canto vivo. */
function Cover({ list }: { list: CustomList }) {
  // Títulos sem pôster no TMDB entram com a arte de cartaz do mundo.
  const posters: (string | null)[] = list.posters.length > 0 ? list.posters.slice(0, 4) : Array.from({ length: Math.min(list.itemCount, 4) }, () => null);
  return (
    <div className="relative h-36 w-full overflow-hidden bg-sunken">
      {posters.length === 0 ? (
        <span className="font-micro absolute inset-0 flex items-center justify-center text-[0.75rem] text-soft">Lista vazia</span>
      ) : (
        posters.map((path, index) => (
          <div key={path ?? `arte-${index}`} className="absolute top-3 w-20" style={{ left: `${12 + index * 44}px`, zIndex: 4 - index }}>
            <Poster path={path} title={list.name} size="w185" seed={`${list.id}-${index}`} className="shadow-lift" />
          </div>
        ))
      )}
    </div>
  );
}

export function Lists() {
  const lists = useLists();
  const create = useCreateList();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setError(null);
    create.mutate({ name }, { onSuccess: () => setName(""), onError: (failure) => setError(failure.message) });
  };

  return (
    <div className="flex flex-col gap-6 pt-2 pb-20 md:pb-8">
      <h1 className="font-display text-[clamp(2.25rem,10vw,4rem)] leading-[1.14]">Listas</h1>
      <form onSubmit={submit} className="flex items-end gap-2">
        <TextField
          label="Lista nova"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={60}
          placeholder="Filmes para dia de chuva"
          className="min-w-0 flex-1"
          error={error}
        />
        <Button type="submit" busy={create.isPending} disabled={!name.trim()}>
          Criar
        </Button>
      </form>

      {lists.isPending ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {[0, 1].map((index) => (
            <Skeleton key={index} className="h-48 w-full" />
          ))}
        </div>
      ) : (lists.data ?? []).length === 0 ? (
        <p className="max-w-[46ch] text-soft">Nenhuma lista ainda. Junte títulos por clima, por ocasião ou pelo que quiser.</p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2">
          {(lists.data ?? []).map((list) => (
            <li key={list.id}>
              <Link href={`/plots/listas/${list.id}`} className="flex flex-col gap-2.5 border border-rule-strong bg-surface p-3 transition-colors duration-fast hover:bg-sunken">
                <Cover list={list} />
                <span className="font-display text-[1.1875rem] leading-[1.14]">{list.name}</span>
                <span className="font-micro flex items-center gap-2 text-[0.6875rem] text-soft">
                  {list.itemCount === 1 ? "1 título" : `${list.itemCount} títulos`}
                  {list.isPrivate ? (
                    <span className="inline-flex items-center gap-1">
                      <Lock aria-hidden className="size-3" />
                      Privada
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
