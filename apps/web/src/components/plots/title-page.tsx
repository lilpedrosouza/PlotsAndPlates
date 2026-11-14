"use client";

import {
  type Provider,
  STREAMINGS,
  TITLE_KINDS,
  TITLE_KIND_LABELS,
  type TitleDetail,
  type TitleKind,
  type WatchLog,
  formatRating,
  tmdbImage,
} from "@pap/shared";
import { Bookmark, BookmarkCheck, Heart, ListPlus, Pencil, RotateCcw, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { RatingInput, RatingStars } from "@/components/ui/rating";
import { Skeleton } from "@/components/ui/skeleton";
import { Stamp } from "@/components/ui/stamp";
import { longDate } from "@/lib/plates/format";
import { creditLine, runtimeLabel, seasonTag } from "@/lib/plots/format";
import { useDeleteLog, useRateSeason, useRateTitle, useSetFavorites, useSetKind, useSetWatchlist } from "@/lib/plots/mutations";
import { useFavorites, useTitle } from "@/lib/plots/queries";
import { useMe } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { AddToListSheet } from "./add-to-list-sheet";
import { LogSheet } from "./log-sheet";
import { POSTER_TRANSITION } from "./open-title";
import { Poster } from "./poster";
import { JustWatchAttribution, TmdbAttribution } from "./tmdb-attribution";

type SheetState = { kind: "log"; season: number | null; log: WatchLog | null } | { kind: "lists" } | null;

function Block({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-rule-strong pt-5">
      <header className="flex items-center justify-between gap-3">
        <h2 className="font-display text-[1.25rem] leading-[1.14]">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export function TitlePage() {
  const { id } = useParams<{ id: string }>();
  const query = useTitle(id);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [sheetKey, setSheetKey] = useState(0);
  const openSheet = (next: SheetState) => {
    setSheetKey((key) => key + 1);
    setSheet(next);
  };

  if (query.isPending) return <TitleSkeleton />;
  if (query.isError || !query.data) {
    return (
      <div role="alert" className="flex flex-col items-start gap-4 pt-6">
        <h1 className="font-display text-3xl leading-[1.14]">Título não encontrado</h1>
        <Link href="/plots/buscar" className={buttonVariants({ variant: "secondary" })}>
          Buscar outro
        </Link>
      </div>
    );
  }

  const title = query.data;
  const close = (open: boolean) => !open && setSheet(null);

  return (
    <article className="flex flex-col gap-8 pb-24">
      <Hero title={title} onLog={() => openSheet({ kind: "log", season: null, log: null })} onLists={() => openSheet({ kind: "lists" })} />
      <YourRating title={title} />
      {title.overview ? (
        <Block title="Sinopse">
          <p className="max-w-[62ch] leading-relaxed">{title.overview}</p>
        </Block>
      ) : null}
      <Credits title={title} />
      <WhereToWatch title={title} />
      {title.tmdbType === "tv" ? <Seasons title={title} onLog={(season) => openSheet({ kind: "log", season, log: null })} /> : null}
      <Logs title={title} onEdit={(log) => openSheet({ kind: "log", season: log.seasonNumber, log })} />
      <TmdbAttribution />

      <LogSheet
        key={`log${sheetKey}`}
        title={title}
        open={sheet?.kind === "log"}
        onOpenChange={close}
        presetSeason={sheet?.kind === "log" ? sheet.season : null}
        log={sheet?.kind === "log" ? sheet.log : null}
      />
      <AddToListSheet key={`list${sheetKey}`} title={title} open={sheet?.kind === "lists"} onOpenChange={close} />
    </article>
  );
}

function Hero({ title, onLog, onLists }: { title: TitleDetail; onLog: () => void; onLists: () => void }) {
  const backdrop = tmdbImage(title.backdropPath, "w1280");
  const watchlist = useSetWatchlist(title.id);
  const favorites = useFavorites();
  const setFavorites = useSetFavorites();
  const [favoriteError, setFavoriteError] = useState<string | null>(null);

  const toggleFavorite = () => {
    const current = (favorites.data ?? []).map((item) => item.id);
    setFavoriteError(null);
    if (title.favorite) {
      setFavorites.mutate(current.filter((titleId) => titleId !== title.id));
    } else if (current.length >= 4) {
      setFavoriteError("O Top 4 está cheio. Tire um título no seu perfil para entrar este.");
    } else {
      setFavorites.mutate([...current, title.id]);
    }
  };

  return (
    <header className="relative -mx-[var(--pap-space-page)] flex flex-col gap-5">
      <div className="relative h-56 overflow-hidden bg-sunken sm:h-72">
        {backdrop ? (
          <Image
            src={backdrop}
            alt=""
            fill
            unoptimized
            priority
            className="object-cover [mask-image:linear-gradient(to_bottom,black_45%,transparent)]"
          />
        ) : null}
      </div>
      <div className="px-page relative z-10 -mt-32 flex items-end gap-4 sm:-mt-40">
        <div className="w-28 shrink-0 shadow-lift sm:w-40">
          <Poster
            path={title.posterPath}
            title={title.title}
            size="w342"
            seed={`${title.tmdbType}:${title.id}`}
            priority
            style={{ viewTransitionName: POSTER_TRANSITION }}
          />
        </div>
        <div className="min-w-0 pb-1">
          <h1 className="font-display text-[clamp(1.75rem,8vw,3rem)] leading-[1.14] text-brand [overflow-wrap:anywhere]">{title.title}</h1>
          {title.originalTitle && title.originalTitle !== title.title ? (
            <p className="mt-1 text-sm text-soft">{title.originalTitle}</p>
          ) : null}
          <p className="font-micro mt-2 text-[0.75rem] text-soft">{creditLine(title)}</p>
          {title.genres.length > 0 ? <p className="font-micro mt-1 text-[0.6875rem] text-soft">{title.genres.join(" · ")}</p> : null}
        </div>
      </div>
      {/* Uma linha só no celular: as duas ações com texto dividem o espaço, os ícones ficam no fim. */}
      <div className="px-page grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] gap-2 sm:flex">
        <Button onClick={onLog} className="px-3">
          {title.inWatchlist ? "Assistimos!" : "Assistimos"}
        </Button>
        <Button
          variant="secondary"
          className="px-3 [&_svg]:hidden sm:[&_svg]:block"
          onClick={() => watchlist.mutate(!title.inWatchlist)}
          aria-pressed={title.inWatchlist}
        >
          {title.inWatchlist ? <BookmarkCheck aria-hidden /> : <Bookmark aria-hidden />}
          {title.inWatchlist ? "No quero ver" : "Quero ver"}
        </Button>
        <Button variant="quiet" size="icon" aria-label={title.favorite ? "Tirar do Top 4" : "Pôr no Top 4"} aria-pressed={title.favorite} onClick={toggleFavorite}>
          <Star aria-hidden className={cn(title.favorite && "fill-current text-brand")} />
        </Button>
        <Button variant="quiet" size="icon" aria-label="Pôr em lista" onClick={onLists}>
          <ListPlus aria-hidden />
        </Button>
      </div>
      {favoriteError ? (
        <p role="alert" className="px-page text-sm font-medium text-danger">
          {favoriteError}
        </p>
      ) : null}
    </header>
  );
}

/** Nota atual: do filme (registro mais recente) ou da série inteira, com a sugestão das temporadas. */
function YourRating({ title }: { title: TitleDetail }) {
  const rate = useRateTitle(title.id);
  const isShow = title.tmdbType === "tv";
  const current = title.myRating?.rating ?? null;
  const suggestion = title.seasonSuggestion;

  return (
    <Block title={isShow ? "Nota da série" : "Sua nota"}>
      <div className="flex items-center gap-5">
        <Stamp value={current} caption="você" size="md" />
        <div className="flex flex-col gap-2">
          <RatingInput
            label={isShow ? "Nota da série inteira" : "Nota do filme"}
            value={current}
            onChange={(rating) => rate.mutate({ rating, liked: title.myRating?.liked, isPrivate: title.myRating?.isPrivate })}
            size={30}
          />
          {isShow && suggestion !== null && suggestion !== current ? (
            <button
              type="button"
              onClick={() => rate.mutate({ rating: suggestion, liked: title.myRating?.liked, isPrivate: title.myRating?.isPrivate })}
              className="font-micro self-start text-[0.75rem] text-brand underline underline-offset-4"
            >
              Usar {formatRating(suggestion)} (média das temporadas)
            </button>
          ) : null}
          {title.myRating?.liked ? (
            <span className="font-micro inline-flex items-center gap-1 text-[0.75rem] text-brand">
              <Heart aria-hidden className="size-3.5 fill-current" />
              Curtido
            </span>
          ) : null}
        </div>
      </div>
      {!isShow ? <p className="text-sm text-soft">A nota segue o registro mais recente; mudar aqui não cria registro.</p> : null}
    </Block>
  );
}

/** O bloco de créditos do pé do cartaz. */
function Credits({ title }: { title: TitleDetail }) {
  const setKind = useSetKind(title.id);
  const lines = [
    title.directors.length > 0 ? { role: title.tmdbType === "tv" ? "Criação" : "Direção", names: title.directors } : null,
    title.cast.length > 0 ? { role: "Elenco", names: title.cast.map((person) => person.name) } : null,
    title.runtime ? { role: "Duração", names: [runtimeLabel(title.runtime, title.tmdbType === "tv")] } : null,
  ].filter((line) => line !== null);

  return (
    <Block title="Créditos">
      {lines.length > 0 ? (
        <dl className="font-micro flex flex-col gap-2 text-[0.8125rem] leading-snug">
          {lines.map((line) => (
            <div key={line.role} className="flex flex-wrap gap-x-2">
              <dt className="text-soft">{line.role}</dt>
              <dd className="text-foreground">{line.names.join(" · ")}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <label className="font-micro flex items-center gap-3 text-[0.75rem] text-soft">
        Tipo
        <select
          value={title.kind}
          onChange={(event) => setKind.mutate(event.target.value as TitleKind)}
          className="h-10 rounded-md border border-rule-strong bg-sunken px-2 text-foreground"
        >
          {TITLE_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {TITLE_KIND_LABELS[kind]}
            </option>
          ))}
        </select>
      </label>
    </Block>
  );
}

function ProviderRow({ label, providers, mine }: { label: string; providers: Provider[]; mine: Set<number> }) {
  if (providers.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="font-micro text-[0.75rem] text-soft">{label}</span>
      <ul className="flex flex-wrap gap-3">
        {providers.map((provider) => {
          const logo = tmdbImage(provider.logoPath, "w92");
          const isMine = mine.has(provider.id);
          return (
            <li key={provider.id} className="flex w-16 flex-col items-center gap-1.5 text-center">
              <span className={cn("block size-12 overflow-hidden rounded-md bg-sunken", isMine && "outline-2 outline-offset-2 outline-brand")}>
                {logo ? <Image src={logo} alt="" width={48} height={48} unoptimized className="size-full object-cover" /> : null}
              </span>
              <span className="text-[0.6875rem] leading-tight">{provider.name}</span>
              {isMine ? <span className="font-micro text-[0.625rem] text-brand">No seu</span> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function WhereToWatch({ title }: { title: TitleDetail }) {
  const streamings = useMe().data?.profile?.streamings ?? [];
  const mine = new Set(STREAMINGS.filter((streaming) => streamings.includes(streaming.key)).map((streaming) => streaming.tmdbProviderId));
  const providers = title.providers;
  const empty = !providers || (providers.flatrate.length + providers.rent.length + providers.buy.length === 0);

  return (
    <Block title="Onde assistir">
      {empty ? (
        <p className="text-soft">Nenhum serviço oferece este título no Brasil agora.</p>
      ) : (
        <div className="flex flex-col gap-5">
          <ProviderRow label="Assinatura" providers={providers.flatrate} mine={mine} />
          <ProviderRow label="Aluguel" providers={providers.rent} mine={mine} />
          <ProviderRow label="Compra" providers={providers.buy} mine={mine} />
        </div>
      )}
      <JustWatchAttribution link={providers?.link} />
    </Block>
  );
}

function Seasons({ title, onLog }: { title: TitleDetail; onLog: (season: number) => void }) {
  const rate = useRateSeason(title.id);
  return (
    <Block title="Temporadas">
      <ol className="flex flex-col">
        {title.seasons.map((season) => (
          <li key={season.number} className="flex flex-col gap-2 border-b border-rule py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-display text-[1.0625rem] leading-tight">{season.number === 0 ? "Especiais" : `T${season.number}`}</p>
              <p className="font-micro mt-1 text-[0.6875rem] text-soft">
                {[season.name, season.episodeCount ? `${season.episodeCount} episódios` : "", season.year ?? ""].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <RatingInput
                label={`Nota da temporada ${season.number}`}
                value={season.myRating}
                onChange={(rating) => rate.mutate({ seasonNumber: season.number, rating })}
                size={24}
              />
              <Button variant="secondary" size="sm" onClick={() => onLog(season.number)}>
                Registrar
              </Button>
            </div>
          </li>
        ))}
      </ol>
    </Block>
  );
}

function Logs({ title, onEdit }: { title: TitleDetail; onEdit: (log: WatchLog) => void }) {
  const remove = useDeleteLog(title.id);
  if (title.logs.length === 0) {
    return (
      <Block title="Seus registros">
        <p className="text-soft">Nenhum registro ainda.</p>
      </Block>
    );
  }
  return (
    <Block title="Seus registros">
      <ol className="flex flex-col">
        {title.logs.map((log) => (
          <li key={log.id} className="flex items-start justify-between gap-3 border-b border-rule py-3">
            <div className="min-w-0">
              <p className="font-micro flex flex-wrap items-center gap-x-2 text-[0.75rem]">
                <span>{longDate(log.watchedOn)}</span>
                {seasonTag(log.seasonNumber) ? <span className="text-brand">{seasonTag(log.seasonNumber)}</span> : null}
                {log.rewatch ? (
                  <span className="inline-flex items-center gap-1 text-soft">
                    <RotateCcw aria-hidden className="size-3" />
                    Reassistido
                  </span>
                ) : null}
                {log.liked ? <Heart aria-label="Curtido" className="size-3.5 fill-current text-brand" /> : null}
                {log.isPrivate ? <span className="text-soft">Privado</span> : null}
              </p>
              {log.rating !== null ? <RatingStars value={log.rating} size={14} className="mt-1.5" /> : null}
              {log.review ? <p className="mt-2 max-w-[60ch] leading-relaxed">{log.review}</p> : null}
            </div>
            <div className="flex shrink-0 gap-1">
              <Button variant="quiet" size="icon" aria-label="Editar registro" onClick={() => onEdit(log)}>
                <Pencil aria-hidden />
              </Button>
              <Button
                variant="quiet"
                size="icon"
                aria-label="Apagar registro"
                onClick={() => {
                  if (window.confirm("Apagar este registro do diário?")) remove.mutate(log.id);
                }}
              >
                <Trash2 aria-hidden />
              </Button>
            </div>
          </li>
        ))}
      </ol>
    </Block>
  );
}

export function TitleSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-5">
      <Skeleton className="-mx-[var(--pap-space-page)] h-56 rounded-none" />
      <div className="-mt-32 flex items-end gap-4">
        <Skeleton className="aspect-[2/3] w-28" />
        <div className="flex-1">
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="mt-2 h-4 w-1/2" />
        </div>
      </div>
    </div>
  );
}
