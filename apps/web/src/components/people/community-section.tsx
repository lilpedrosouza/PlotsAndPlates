"use client";

import { type CommunityReview, formatRating } from "@pap/shared";
import Link from "next/link";
import { useSection } from "@/components/shell/section-context";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Stamp } from "@/components/ui/stamp";
import { useCommunity } from "@/lib/people/queries";

const reviewDate = (date: string) =>
  new Date(date.length === 10 ? `${date}T12:00:00` : date).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" });

/**
 * "O que o pessoal do PAP achou": média de quem não é você nem seu par e as
 * avaliações públicas mais recentes, de 10 em 10.
 */
export function CommunitySection({ kind, id }: { kind: "restaurants" | "titles"; id: string }) {
  const query = useCommunity(kind, id);
  const first = query.data?.pages[0];
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section aria-labelledby="comunidade-titulo" className="flex flex-col gap-5 border-t border-rule-strong pt-5">
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <h2 id="comunidade-titulo" className="font-display text-[1.375rem] leading-tight">
          O que o pessoal do PAP achou
        </h2>
        {first && first.count > 0 ? (
          <p className="flex items-baseline gap-2">
            <span className="font-display text-[2rem] leading-none tabular-nums">{formatRating(first.average)}</span>
            <span className="font-micro text-[0.75rem] text-soft">{first.count === 1 ? "de 1 avaliação" : `de ${first.count} avaliações`}</span>
          </p>
        ) : null}
      </header>

      {query.isPending ? (
        <div aria-busy className="flex flex-col gap-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : query.isError ? (
        <p role="alert" className="text-soft">
          Não deu para carregar as avaliações do pessoal agora.
        </p>
      ) : items.length === 0 ? (
        <p className="text-soft">Ninguém de fora avaliou ainda. Quando alguém do PAP der uma nota pública, ela aparece aqui.</p>
      ) : (
        <>
          <ol className="flex flex-col">
            {items.map((item, index) => (
              <li key={`${item.person.id}-${item.date}-${index}`}>
                <ReviewRow item={item} />
              </li>
            ))}
          </ol>
          {query.hasNextPage ? (
            <Button variant="secondary" size="sm" className="self-start" busy={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
              Ver mais
            </Button>
          ) : null}
        </>
      )}
    </section>
  );
}

function ReviewRow({ item }: { item: CommunityReview }) {
  const section = useSection();
  const href = `/${section}/u/${item.person.username}`;
  return (
    <article className="flex gap-3 border-b border-rule py-4">
      <Link href={href} className="shrink-0 self-start" aria-hidden tabIndex={-1}>
        <Avatar name={item.person.displayName} src={item.person.avatarUrl} size={32} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="flex flex-wrap items-baseline gap-x-2 leading-tight">
          <Link href={href} className="font-semibold underline-offset-4 hover:underline">
            {item.person.displayName}
          </Link>
          <span className="font-micro text-[0.6875rem] text-soft">
            {item.seasonNumber ? `T${item.seasonNumber} · ` : ""}
            {reviewDate(item.date)}
          </span>
        </p>
        {item.review ? (
          <p className={section === "plates" ? "font-display leading-snug italic" : "leading-snug"}>
            {section === "plates" ? `“${item.review}”` : item.review}
          </p>
        ) : null}
      </div>
      {item.rating !== null ? <Stamp value={item.rating} size="sm" className="self-start" tilt={section === "plates" ? -4 : undefined} /> : null}
    </article>
  );
}
