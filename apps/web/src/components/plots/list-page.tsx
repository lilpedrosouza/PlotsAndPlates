"use client";

import { ArrowDown, ArrowUp, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Sheet } from "@/components/plates/sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChipToggle } from "@/components/ui/chip";
import { TextAreaField, TextField } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { creditLine } from "@/lib/plots/format";
import { useDeleteList, useRemoveListItem, useReorderList, useUpdateList } from "@/lib/plots/mutations";
import { useList } from "@/lib/plots/queries";
import { catalog } from "@/lib/plates/format";
import { useOpenTitle } from "./open-title";
import { Poster } from "./poster";

export function ListPage() {
  const { id } = useParams<{ id: string }>();
  const query = useList(id);
  const reorder = useReorderList(id);
  const remove = useRemoveListItem(id);
  const open = useOpenTitle();
  const [editing, setEditing] = useState(false);
  const [editKey, setEditKey] = useState(0);

  if (query.isPending) return <ListSkeleton />;
  if (query.isError || !query.data) {
    return (
      <div role="alert" className="flex flex-col items-start gap-4 pt-6">
        <h1 className="font-display text-3xl leading-[1.14]">Lista não encontrada</h1>
        <Link href="/plots/listas" className={buttonVariants({ variant: "secondary" })}>
          Voltar às listas
        </Link>
      </div>
    );
  }

  const list = query.data;
  const ids = list.items.map((item) => item.id);
  const move = (index: number, delta: number) => {
    const next = [...ids];
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(index + delta, 0, moved);
    reorder.mutate(next);
  };

  return (
    <div className="flex flex-col gap-6 pt-2 pb-20 md:pb-8">
      <header className="flex flex-col gap-3 border-b border-rule-strong pb-4">
        <h1 className="font-display text-[clamp(2rem,9vw,3.5rem)] leading-[1.14]">{list.name}</h1>
        {list.description ? <p className="max-w-[56ch] leading-relaxed text-soft">{list.description}</p> : null}
        <p className="font-micro text-[0.75rem] text-soft">
          {list.itemCount === 1 ? "1 título" : `${list.itemCount} títulos`}
          {list.isPrivate ? " · privada" : " · pública"}
        </p>
        {list.isMine ? (
          <Button
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={() => {
              setEditKey((key) => key + 1);
              setEditing(true);
            }}
          >
            Editar lista
          </Button>
        ) : null}
      </header>

      {list.items.length === 0 ? (
        <p className="max-w-[46ch] text-soft">Lista vazia. Na página de um título, toque em “Pôr em lista”.</p>
      ) : (
        <ol className="flex flex-col">
          {list.items.map((item, index) => {
            const href = `/plots/t/${item.title.id}`;
            return (
              <li key={item.id} className="flex items-center gap-3 border-b border-rule py-3">
                <span className="font-micro w-10 shrink-0 text-[0.75rem] text-soft">Nº {catalog(index + 1).slice(2)}</span>
                <Link href={href} onClick={(event) => open(event, href)} className="flex min-w-0 flex-1 items-center gap-3">
                  <div data-poster className="w-12 shrink-0">
                    <Poster path={item.title.posterPath} title={item.title.title} size="w92" seed={`${item.title.tmdbType}:${item.title.id}`} />
                  </div>
                  <span className="min-w-0">
                    <span className="font-display block truncate text-[1.0625rem] leading-tight">{item.title.title}</span>
                    <span className="font-micro mt-1 block text-[0.6875rem] text-soft">{creditLine(item.title)}</span>
                  </span>
                </Link>
                {list.isMine ? (
                  <span className="flex shrink-0">
                    <Button variant="quiet" size="icon" aria-label={`Subir ${item.title.title}`} disabled={index === 0} onClick={() => move(index, -1)}>
                      <ArrowUp aria-hidden />
                    </Button>
                    <Button
                      variant="quiet"
                      size="icon"
                      aria-label={`Descer ${item.title.title}`}
                      disabled={index === list.items.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown aria-hidden />
                    </Button>
                    <Button variant="quiet" size="icon" aria-label={`Tirar ${item.title.title} da lista`} onClick={() => remove.mutate(item.id)}>
                      <X aria-hidden />
                    </Button>
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      {list.isMine ? (
        <EditListSheet key={editKey} listId={list.id} initial={list} open={editing} onOpenChange={setEditing} />
      ) : null}
    </div>
  );
}

function EditListSheet({
  listId,
  initial,
  open,
  onOpenChange,
}: {
  listId: string;
  initial: { name: string; description: string; isPrivate: boolean };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [isPrivate, setPrivate] = useState(initial.isPrivate);
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateList(listId);
  const remove = useDeleteList(listId);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Editar lista"
      footer={
        <div className="flex gap-3 [&>*:last-child]:min-w-0 [&>*:last-child]:flex-1">
          <Button
            variant="danger"
            busy={remove.isPending}
            onClick={() => {
              if (!window.confirm(`Apagar a lista “${initial.name}”? Os títulos continuam no diário.`)) return;
              remove.mutate(undefined, { onSuccess: () => router.push("/plots/listas") });
            }}
          >
            Apagar
          </Button>
          <Button
            block
            busy={update.isPending}
            onClick={() => {
              setError(null);
              update.mutate({ name, description, isPrivate }, { onSuccess: () => onOpenChange(false), onError: (failure) => setError(failure.message) });
            }}
          >
            Salvar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <TextField label="Nome" value={name} onChange={(event) => setName(event.target.value)} maxLength={60} error={error} />
        <TextAreaField label="Descrição" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={300} />
        <div className="flex flex-col items-start gap-1.5">
          <ChipToggle pressed={isPrivate} onPressedChange={setPrivate}>
            Lista privada
          </ChipToggle>
          <p className="text-sm text-soft">{isPrivate ? "Só você vê." : "Outras pessoas do PAP podem ver esta lista."}</p>
        </div>
      </div>
    </Sheet>
  );
}

export function ListSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-3 pt-2">
      <Skeleton className="h-12 w-2/3" />
      {[0, 1, 2].map((index) => (
        <Skeleton key={index} className="h-16 w-full" />
      ))}
    </div>
  );
}
