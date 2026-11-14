"use client";

import type { TitleDetail } from "@pap/shared";
import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { Sheet } from "@/components/plates/sheet";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { useAddListItem, useCreateList } from "@/lib/plots/mutations";
import { cn } from "@/lib/utils";

/** Pôr o título numa lista existente ou numa lista nova. */
export function AddToListSheet({ title, open, onOpenChange }: { title: TitleDetail; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const add = useAddListItem();
  const create = useCreateList();

  const addTo = (listId: string) => {
    setError(null);
    add.mutate({ listId, titleId: title.id }, { onError: (failure) => setError(failure.message) });
  };

  const createAndAdd = () => {
    if (!name.trim()) return;
    setError(null);
    create.mutate(
      { name },
      {
        onSuccess: (list) => {
          setName("");
          addTo(list.id);
        },
        onError: (failure) => setError(failure.message),
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Pôr em lista" description={title.title}>
      <div className="flex flex-col gap-6">
        {title.lists.length > 0 ? (
          <ul className="flex flex-col border-t border-rule">
            {title.lists.map((list) => (
              <li key={list.id} className="border-b border-rule">
                <button
                  type="button"
                  disabled={list.hasTitle || add.isPending}
                  onClick={() => addTo(list.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 py-3.5 text-left transition-colors duration-fast hover:bg-sunken/70",
                    list.hasTitle && "text-soft",
                  )}
                >
                  <span className="font-display truncate text-[1.0625rem] leading-tight">{list.name}</span>
                  {list.hasTitle ? (
                    <span className="font-micro inline-flex items-center gap-1 text-[0.6875rem] text-brand">
                      <Check aria-hidden className="size-4" />
                      Já está
                    </span>
                  ) : (
                    <Plus aria-hidden className="size-5 text-soft" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-soft">Nenhuma lista ainda. Crie a primeira:</p>
        )}
        <div className="flex items-end gap-2">
          <TextField
            label="Lista nova"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={60}
            placeholder="Filmes para dia de chuva"
            className="min-w-0 flex-1"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                createAndAdd();
              }
            }}
          />
          <Button variant="secondary" onClick={createAndAdd} busy={create.isPending} disabled={!name.trim()}>
            Criar
          </Button>
        </div>
        {error ? (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}
