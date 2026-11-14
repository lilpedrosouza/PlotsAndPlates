"use client";

import {
  DISH_CATEGORY_LABELS,
  type DishWithScore,
  RESTAURANT_CRITERIA,
  RESTAURANT_CRITERIA_LABELS,
  type RestaurantDetail,
  WISHLIST_PRIORITY_LABELS,
  formatRating,
} from "@pap/shared";
import { Bookmark, Pencil, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { RatingStars } from "@/components/ui/rating";
import { Skeleton } from "@/components/ui/skeleton";
import { Stamp } from "@/components/ui/stamp";
import { skipsOptimizer } from "@/lib/image";
import { catalog, longDate, money, placeLine, tiltFor } from "@/lib/plates/format";
import { useDeleteVisit, useSetWishlist } from "@/lib/plates/mutations";
import { useRestaurant } from "@/lib/plates/queries";
import { cn } from "@/lib/utils";
import { ArchPhoto } from "./arch-photo";
import { OsmAttribution } from "./attribution";
import { FomosButton } from "./fomos-button";
import { GoogleLivePanel } from "./google-live-panel";
import { HERO_TRANSITION } from "./restaurant-card";
import { DishRatingSheet, DishSheet, RatingSheet, VisitSheet } from "./restaurant-sheets";

type SheetState =
  | { kind: "rating" }
  | { kind: "visit" }
  | { kind: "dish"; dish: DishWithScore | null }
  | { kind: "dish-rating"; dish: DishWithScore }
  | null;

function Block({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5 border-t border-rule-strong pt-5">
      <header className="flex items-center justify-between gap-3">
        <h2 className="font-display text-[1.375rem] leading-tight">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export function RestaurantPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const query = useRestaurant(id);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sheet, setSheet] = useState<SheetState>(null);
  // Cada abertura monta a folha de novo, com os dados atuais.
  const [sheetKey, setSheetKey] = useState(0);
  const openSheet = (next: SheetState) => {
    setSheetKey((key) => key + 1);
    setSheet(next);
  };

  // "?avaliar=1" (depois do cadastro ou do "Fomos!") abre a avaliação assim que a página carrega.
  const ratingFromLink = searchParams.get("avaliar") === "1" && Boolean(query.data);

  if (query.isPending) return <RestaurantSkeleton />;
  if (query.isError || !query.data) {
    return (
      <div role="alert" className="flex flex-col items-start gap-4 pt-6">
        <h1 className="font-display text-3xl leading-tight">Não achei esse restaurante</h1>
        <p className="text-soft">{query.error instanceof Error ? query.error.message : "Ele pode ter sido apagado."}</p>
        <Link href="/plates" className={buttonVariants({ variant: "secondary" })}>
          Voltar ao caderno
        </Link>
      </div>
    );
  }

  const restaurant = query.data;
  const close = (open: boolean) => {
    if (open) return;
    setSheet(null);
    if (ratingFromLink) router.replace(`/plates/r/${id}`, { scroll: false });
  };

  return (
    <article className="flex flex-col gap-9 pt-2 pb-24">
      <Hero restaurant={restaurant} onRate={() => openSheet({ kind: "rating" })} onVisit={() => openSheet({ kind: "visit" })} />
      <Ratings restaurant={restaurant} onRate={() => openSheet({ kind: "rating" })} />
      <Dishes
        restaurant={restaurant}
        onAdd={() => openSheet({ kind: "dish", dish: null })}
        onOpen={(dish) => openSheet({ kind: "dish-rating", dish })}
      />
      <Visits restaurant={restaurant} onAdd={() => openSheet({ kind: "visit" })} />
      <About restaurant={restaurant} />

      <RatingSheet key={`r${sheetKey}`} restaurantId={restaurant.id} current={restaurant.myRating} open={sheet?.kind === "rating" || ratingFromLink} onOpenChange={close} />
      <VisitSheet key={`v${sheetKey}`} restaurantId={restaurant.id} dishes={restaurant.dishes} open={sheet?.kind === "visit"} onOpenChange={close} />
      <DishSheet
        key={`d${sheetKey}`}
        restaurantId={restaurant.id}
        dish={sheet?.kind === "dish" ? sheet.dish : null}
        open={sheet?.kind === "dish"}
        onOpenChange={close}
      />
      {sheet?.kind === "dish-rating" ? (
        <DishRatingSheet
          key={`dr${sheetKey}`}
          restaurantId={restaurant.id}
          dish={sheet.dish}
          open
          onOpenChange={close}
          onEditDish={sheet.dish.canEdit ? () => openSheet({ kind: "dish", dish: sheet.dish }) : undefined}
        />
      ) : null}
    </article>
  );
}

function Hero({ restaurant, onRate, onVisit }: { restaurant: RestaurantDetail; onRate: () => void; onVisit: () => void }) {
  return (
    <header className="grid gap-6 sm:grid-cols-[minmax(0,18rem)_1fr] sm:items-end">
      <div className="relative mx-auto w-full max-w-[19rem] sm:mx-0">
        <ArchPhoto
          src={restaurant.coverUrl}
          alt={`Foto de ${restaurant.name}`}
          sizes="(min-width: 640px) 18rem, 19rem"
          priority
          style={{ viewTransitionName: HERO_TRANSITION }}
        />
        <Stamp value={restaurant.myOverall} caption="você" size="lg" tilt={tiltFor(restaurant.id)} className="absolute -right-3 bottom-5 bg-background" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="rule-double pt-4">
          <h1 className="font-display text-[clamp(2.25rem,9vw,3.25rem)] leading-[1.02] [overflow-wrap:anywhere]">{restaurant.name}</h1>
          {placeLine(restaurant) ? <p className="font-micro mt-2 text-[0.8125rem] text-soft">{placeLine(restaurant)}</p> : null}
        </div>
        {restaurant.wishlist ? (
          <div className="flex flex-col gap-3 rounded-md border border-dashed border-rule-strong p-4">
            <p className="font-micro flex items-center gap-1.5 text-[0.75rem] text-soft">
              <Bookmark aria-hidden className="size-4" />
              No quero ir · prioridade {WISHLIST_PRIORITY_LABELS[restaurant.wishlist.priority].toLowerCase()}
            </p>
            {restaurant.wishlist.reason ? <p className="font-display italic leading-snug">“{restaurant.wishlist.reason}”</p> : null}
            <FomosButton restaurantId={restaurant.id} block />
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Button onClick={onRate}>{restaurant.myRating ? "Mudar nota" : "Avaliar"}</Button>
            <Button variant="secondary" onClick={onVisit}>
              <Plus aria-hidden />
              Nova visita
            </Button>
            {restaurant.canEdit ? (
              <Link href={`/plates/r/${restaurant.id}/editar`} className={buttonVariants({ variant: "quiet" })}>
                <Pencil aria-hidden />
                Editar
              </Link>
            ) : null}
          </div>
        )}
        {restaurant.wishlist && restaurant.canEdit ? (
          <Link href={`/plates/r/${restaurant.id}/editar`} className={cn(buttonVariants({ variant: "quiet", size: "sm" }), "self-start")}>
            <Pencil aria-hidden />
            Editar dados
          </Link>
        ) : null}
        {!restaurant.wishlist && restaurant.visitCount === 0 ? <AddToWishlist restaurantId={restaurant.id} /> : null}
      </div>
    </header>
  );
}

function AddToWishlist({ restaurantId }: { restaurantId: string }) {
  const set = useSetWishlist(restaurantId);
  return (
    <Button variant="quiet" size="sm" className="self-start" busy={set.isPending} onClick={() => set.mutate({ priority: "media" })}>
      <Bookmark aria-hidden />
      Pôr no quero ir
    </Button>
  );
}

/** As notas como a tabela de informação de um rótulo de mercearia. */
function Ratings({ restaurant, onRate }: { restaurant: RestaurantDetail; onRate: () => void }) {
  const rating = restaurant.myRating;
  return (
    <Block title="Nossas notas">
      {rating ? (
        <div className="flex flex-col gap-5">
          <div className="border-2 border-foreground px-4 pt-3 pb-4">
            <p className="font-micro border-b border-foreground pb-2 text-[0.75rem]">
              Informação de avaliação · por pessoa{rating.isPrivate ? " · privada" : ""}
            </p>
            <dl className="divide-y divide-rule">
              {RESTAURANT_CRITERIA.map((key) => (
                <div key={key} className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="font-semibold">{RESTAURANT_CRITERIA_LABELS[key]}</dt>
                  <dd className="flex items-center gap-3">
                    <RatingStars value={rating[key]} size={16} />
                    <span className="font-display w-9 text-right tabular-nums">{rating[key] === null ? "–" : formatRating(rating[key])}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-1 flex items-center justify-between gap-3 border-t-[6px] border-foreground pt-3">
              <span className="font-display text-xl">Nota geral</span>
              <Stamp value={rating.overall} caption="você" size="md" />
            </div>
          </div>
          {rating.review ? (
            <blockquote className="font-display border-l-0 text-[1.1875rem] italic leading-relaxed text-foreground">“{rating.review}”</blockquote>
          ) : null}
          <p className="text-sm text-soft">A nota do seu par aparece aqui ao lado quando vocês se vincularem.</p>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="text-soft">Ainda sem nota. Dá para avaliar só a comida agora e completar depois.</p>
          <Button variant="secondary" onClick={onRate}>
            Avaliar
          </Button>
        </div>
      )}
    </Block>
  );
}

/** Pratos como um cardápio numerado: nome, pontilhado e a nota na margem. */
function Dishes({ restaurant, onAdd, onOpen }: { restaurant: RestaurantDetail; onAdd: () => void; onOpen: (dish: DishWithScore) => void }) {
  return (
    <Block
      title="Pratos"
      action={
        restaurant.canEdit ? (
          <Button variant="secondary" size="sm" onClick={onAdd}>
            <Plus aria-hidden />
            Prato
          </Button>
        ) : null
      }
    >
      {restaurant.dishes.length === 0 ? (
        <p className="text-soft">
          {restaurant.canEdit ? "Nenhum prato anotado ainda. Anota o que vocês pediram para dar nota a cada um." : "Nenhum prato anotado ainda. Só quem cadastrou o restaurante acrescenta pratos."}
        </p>
      ) : (
        <ol className="flex flex-col">
          {restaurant.dishes.map((dish, index) => {
            const meta = [
              DISH_CATEGORY_LABELS[dish.category],
              money(dish.priceCents),
              dish.myRating?.wouldOrderAgain === true ? "pediria de novo" : dish.myRating?.wouldOrderAgain === false ? "não pediria" : "",
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <li key={dish.id}>
                <button
                  type="button"
                  onClick={() => onOpen(dish)}
                  className="flex w-full items-center gap-3 border-b border-rule py-3 text-left transition-colors duration-fast hover:bg-sunken/60"
                >
                  <span className="font-micro w-6 shrink-0 text-[0.8125rem] text-soft">{index + 1}.</span>
                  {dish.photo ? (
                    <Image
                      src={dish.photo.thumbUrl}
                      alt=""
                      width={40}
                      height={50}
                      unoptimized={skipsOptimizer(dish.photo.thumbUrl)}
                      className="arch h-[50px] w-10 shrink-0 object-cover"
                    />
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="font-display min-w-0 truncate text-[1.125rem] leading-tight">{dish.name}</span>
                      <span aria-hidden className="mb-[0.3em] min-w-4 flex-1 border-b-2 border-dotted border-rule-strong" />
                      <span className={cn("font-display shrink-0 text-[1.125rem] tabular-nums", dish.score === null ? "text-soft" : "text-brand")}>
                        {dish.score === null ? "dar nota" : formatRating(dish.score)}
                      </span>
                    </span>
                    {meta ? <span className="font-micro mt-1 block text-[0.6875rem] text-soft">{meta}</span> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </Block>
  );
}

function Visits({ restaurant, onAdd }: { restaurant: RestaurantDetail; onAdd: () => void }) {
  const remove = useDeleteVisit(restaurant.id);
  const dishName = new Map(restaurant.dishes.map((dish) => [dish.id, dish.name]));
  const total = restaurant.visits.length;
  return (
    <Block
      title="Visitas"
      action={
        <Button variant="secondary" size="sm" onClick={onAdd}>
          <Plus aria-hidden />
          Visita
        </Button>
      }
    >
      {total === 0 ? (
        <p className="text-soft">Nenhuma visita registrada ainda.</p>
      ) : (
        <ol className="flex flex-col gap-6">
          {restaurant.visits.map((visit, index) => (
            <li key={visit.id} className="flex flex-col gap-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-micro text-[0.75rem] text-soft">Visita nº {catalog(total - index)}</p>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Apagar esta visita? As fotos dela também somem.")) remove.mutate(visit.id);
                  }}
                  className="text-sm text-soft underline-offset-3 hover:text-danger hover:underline"
                >
                  Apagar
                </button>
              </div>
              <p className="font-display text-lg leading-tight">
                {longDate(visit.visitedOn)}
                {visit.occasion ? <span className="text-soft"> · {visit.occasion}</span> : null}
              </p>
              {visit.amountCents != null ? <p className="text-sm text-soft">Gastamos {money(visit.amountCents)}</p> : null}
              {visit.dishIds.length > 0 ? (
                <p className="text-sm">
                  <span className="text-soft">Pedimos: </span>
                  {visit.dishIds.map((dishId) => dishName.get(dishId)).filter(Boolean).join(", ")}
                </p>
              ) : null}
              {visit.photos.length > 0 ? (
                <ul className="flex gap-2 overflow-x-auto pb-1">
                  {visit.photos.map((photo) => (
                    <li key={photo.id} className="shrink-0">
                      <a href={photo.url} target="_blank" rel="noreferrer">
                        <Image
                          src={photo.thumbUrl}
                          alt={`Foto da visita de ${longDate(visit.visitedOn)}`}
                          width={96}
                          height={120}
                          unoptimized={skipsOptimizer(photo.thumbUrl)}
                          className="arch h-[120px] w-24 object-cover"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </Block>
  );
}

function About({ restaurant }: { restaurant: RestaurantDetail }) {
  const rows = [
    restaurant.address || restaurant.neighborhood || restaurant.city
      ? { label: "Endereço", value: [restaurant.address, restaurant.neighborhood, restaurant.city].filter(Boolean).join(" · ") }
      : null,
    restaurant.phone
      ? {
          label: "Telefone",
          value: (
            <a href={`tel:${restaurant.phone.replace(/[^\d+]/g, "")}`} className="underline underline-offset-3">
              {restaurant.phone}
            </a>
          ),
        }
      : null,
    restaurant.website
      ? {
          label: "Site",
          value: (
            <a href={restaurant.website} target="_blank" rel="noreferrer" className="break-all underline underline-offset-3">
              {restaurant.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </a>
          ),
        }
      : null,
    restaurant.openingHours ? { label: "Horário", value: restaurant.openingHours } : null,
  ].filter((row) => row !== null);

  return (
    <Block title="Sobre o lugar">
      {restaurant.description ? <p className="max-w-[60ch] leading-relaxed">{restaurant.description}</p> : null}
      {rows.length > 0 ? (
        <dl className="grid gap-3">
          {rows.map((row) => (
            <div key={row.label} className="grid gap-0.5 sm:grid-cols-[8rem_1fr]">
              <dt className="font-micro text-[0.75rem] text-soft">{row.label}</dt>
              <dd className="whitespace-pre-line">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-soft">Sem endereço nem contato ainda.</p>
      )}
      {restaurant.osmRef ? <OsmAttribution className="text-xs text-soft" /> : null}
      {restaurant.googlePlaceId ? <GoogleLivePanel placeId={restaurant.googlePlaceId} /> : null}
    </Block>
  );
}

export function RestaurantSkeleton() {
  return (
    <div aria-busy className="grid gap-6 pt-2 sm:grid-cols-[minmax(0,18rem)_1fr] sm:items-end">
      <Skeleton className="arch mx-auto aspect-[4/5] w-full max-w-[19rem] sm:mx-0" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="mt-3 h-12 w-40" />
      </div>
    </div>
  );
}
