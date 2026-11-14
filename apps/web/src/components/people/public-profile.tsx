"use client";

import { type PublicPlatesProfile, type PublicPlotsProfile, type PublicProfile, formatRating } from "@pap/shared";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArchPhoto } from "@/components/plates/arch-photo";
import { Poster } from "@/components/plots/poster";
import { useSection } from "@/components/shell/section-context";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Stamp } from "@/components/ui/stamp";
import { ApiRequestError } from "@/lib/api";
import { useCouple, useSendInvite } from "@/lib/couple/queries";
import { skipsOptimizer } from "@/lib/image";
import { usePlatesProfile, usePlotsProfile } from "@/lib/people/queries";
import { shortDate, tiltFor } from "@/lib/plates/format";
import { dayLabel, seasonTag } from "@/lib/plots/format";
import { useMe } from "@/lib/queries";
import { cn } from "@/lib/utils";

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-rule-strong pt-5">
      <h2 className="font-display text-[1.375rem] leading-tight">{title}</h2>
      {children}
    </section>
  );
}

/** Capa, foto, nome, @ e bio; "seu par" ou o convite quando faz sentido. */
function ProfileHeader({ profile, isPartner }: { profile: PublicProfile; isPartner: boolean }) {
  const section = useSection();
  return (
    <section aria-label="Perfil">
      <div className={cn("relative aspect-[16/6] overflow-hidden bg-sunken", section === "plates" ? "frame-label" : "border border-rule")}>
        {profile.bannerUrl ? (
          <Image src={profile.bannerUrl} alt="" fill sizes="(min-width: 672px) 672px, 100vw" className="object-cover" priority unoptimized={skipsOptimizer(profile.bannerUrl)} />
        ) : null}
      </div>
      <div className="-mt-9 flex items-end gap-4 px-4">
        <Avatar name={profile.displayName} src={profile.avatarUrl} size={88} className="ring-4 ring-background" accent={profile.accent} world={section} priority />
        <div className="min-w-0 pb-1">
          <h1 className="font-display truncate text-2xl leading-tight">{profile.displayName}</h1>
          <p className="font-micro flex flex-wrap items-center gap-x-2 text-[0.875rem] text-soft">
            @{profile.username}
            {isPartner ? <span className="border border-rule-strong px-1.5 text-[0.6875rem] leading-[1.5] text-foreground">seu par</span> : null}
          </p>
        </div>
      </div>
      {profile.bio ? <p className="mt-4 max-w-[60ch] px-1 leading-relaxed">{profile.bio}</p> : null}
      <InviteAction profile={profile} />
    </section>
  );
}

/** "Convidar para ser meu par": só quando você está sem par e sem convite pendente. */
function InviteAction({ profile }: { profile: PublicProfile }) {
  const me = useMe().data?.profile;
  const couple = useCouple();
  const send = useSendInvite();
  const [error, setError] = useState<string | null>(null);
  const state = couple.data;
  if (!me || !state || me.id === profile.id || state.partner || state.outgoing.length > 0) {
    const sent = state?.outgoing.some((invite) => invite.to.id === profile.id);
    return sent ? <p className="font-micro mt-4 px-1 text-[0.75rem] text-soft">Convite para ser par enviado. Esperando resposta.</p> : null;
  }
  return (
    <div className="mt-4 flex flex-col items-start gap-2 px-1">
      <Button
        variant="secondary"
        size="sm"
        busy={send.isPending}
        onClick={() => {
          setError(null);
          send.mutate(profile.username, { onError: (failure) => setError(failure.message) });
        }}
      >
        Convidar para ser meu par
      </Button>
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function NotFound({ error }: { error: unknown }) {
  const section = useSection();
  const missing = error instanceof ApiRequestError && error.status === 404;
  return (
    <div role="alert" className="flex flex-col items-start gap-4 pt-6">
      <h1 className="font-display text-3xl leading-tight">{missing ? "Não achamos essa pessoa" : "Não deu para abrir o perfil"}</h1>
      <p className="text-soft">{error instanceof Error ? error.message : "Tenta de novo daqui a pouco."}</p>
      <Link href={`/${section}/pessoas`} className={buttonVariants({ variant: "secondary" })}>
        Buscar pessoas
      </Link>
    </div>
  );
}

/** Três números como uma linha de cardápio (Plates) ou de créditos (Plots). */
function Stats({ items }: { items: { value: string; label: string }[] }) {
  return (
    <dl className="grid grid-cols-3 border-y border-rule-strong">
      {items.map((item, index) => (
        <div key={item.label} className={cn("flex flex-col gap-1 py-3", index > 0 && "border-l border-rule pl-3")}>
          <dt className="font-micro order-2 text-[0.6875rem] text-soft">{item.label}</dt>
          <dd className="font-display order-1 text-[1.75rem] leading-none tabular-nums">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PublicProfileSkeleton() {
  return (
    <div aria-busy className="mx-auto flex max-w-2xl flex-col gap-6 pt-2">
      <Skeleton className="aspect-[16/6] w-full" />
      <div className="flex items-end gap-4 px-4">
        <Skeleton className="size-[88px] shrink-0 plates:rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="mt-2 h-4 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

const useUsername = () => decodeURIComponent(useParams<{ username: string }>().username ?? "");

export function PlatesPublicProfile() {
  const username = useUsername();
  const query = usePlatesProfile(username);
  if (query.isPending) return <PublicProfileSkeleton />;
  if (query.isError) return <NotFound error={query.error} />;
  return <PlatesBody data={query.data} />;
}

function PlatesBody({ data }: { data: PublicPlatesProfile }) {
  const { stats } = data;
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-9 pt-2 pb-24">
      <ProfileHeader profile={data.profile} isPartner={data.isPartner} />
      <Stats
        items={[
          { value: String(stats.restaurants), label: stats.restaurants === 1 ? "restaurante" : "restaurantes" },
          { value: String(stats.visits), label: stats.visits === 1 ? "visita" : "visitas" },
          { value: formatRating(stats.averageRating), label: "nota média" },
        ]}
      />
      <Block title="Favoritos">
        {data.favorites.length === 0 ? (
          <p className="text-soft">Ainda sem avaliações públicas para escolher os favoritos.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {data.favorites.map((place) => (
              <li key={place.id}>
                <Link href={`/plates/r/${place.id}`} className="frame-label flex h-full flex-col bg-surface p-2.5">
                  <ArchPhoto src={place.coverThumbUrl} alt={`Foto de ${place.name}`} sizes="(min-width: 640px) 10rem, 44vw" />
                  <div className="rule-double mt-2.5 flex items-end justify-between gap-2 pt-2">
                    <span className="font-display min-w-0 text-[1rem] leading-[1.15] [overflow-wrap:anywhere]">{place.name}</span>
                    <Stamp value={place.overall} size="sm" tilt={tiltFor(place.id)} accent={data.profile.accent} className="-mr-1 -mb-1 scale-90" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Block>
      <Block title="Avaliações recentes">
        {data.recent.length === 0 ? (
          <p className="text-soft">Nenhuma avaliação para mostrar.</p>
        ) : (
          <ol className="flex flex-col">
            {data.recent.map((item) => (
              <li key={`${item.restaurantId}-${item.date}`}>
                <Link href={`/plates/r/${item.restaurantId}`} className="flex items-start gap-3 border-b border-rule py-4 transition-colors duration-fast hover:bg-sunken/60">
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="font-display text-[1.125rem] leading-tight">{item.restaurantName}</span>
                    {item.review ? <span className="font-display line-clamp-3 leading-snug text-soft italic">“{item.review}”</span> : null}
                    <span className="font-micro text-[0.6875rem] text-soft">{shortDate(item.date.slice(0, 10))}</span>
                  </div>
                  <Stamp value={item.overall} size="sm" tilt={tiltFor(item.restaurantId)} accent={data.profile.accent} />
                </Link>
              </li>
            ))}
          </ol>
        )}
      </Block>
    </div>
  );
}

export function PlotsPublicProfile() {
  const username = useUsername();
  const query = usePlotsProfile(username);
  if (query.isPending) return <PublicProfileSkeleton />;
  if (query.isError) return <NotFound error={query.error} />;
  return <PlotsBody data={query.data} />;
}

function PlotsBody({ data }: { data: PublicPlotsProfile }) {
  const { stats } = data;
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-9 pt-2 pb-24">
      <ProfileHeader profile={data.profile} isPartner={data.isPartner} />
      <Stats
        items={[
          { value: String(stats.sessions), label: stats.sessions === 1 ? "sessão" : "sessões" },
          { value: String(stats.titles), label: stats.titles === 1 ? "título" : "títulos" },
          { value: formatRating(stats.averageRating), label: "nota média" },
        ]}
      />
      <Block title="Top 4">
        {data.favorites.length === 0 ? (
          <p className="text-soft">Ainda sem Top 4.</p>
        ) : (
          <ol className="grid grid-cols-4 gap-2">
            {data.favorites.map((title) => (
              <li key={title.id}>
                <Link href={`/plots/t/${title.id}`} aria-label={title.title} className="block">
                  <Poster path={title.posterPath} title={title.title} size="w185" seed={`${title.tmdbType}:${title.id}`} />
                </Link>
              </li>
            ))}
          </ol>
        )}
      </Block>
      <Block title="Sessões recentes">
        {data.recent.length === 0 ? (
          <p className="text-soft">Nenhuma sessão para mostrar.</p>
        ) : (
          <ol className="flex flex-col">
            {data.recent.map((item, index) => (
              <li key={`${item.titleId}-${item.date}-${index}`}>
                <Link href={`/plots/t/${item.titleId}`} className="flex items-center gap-3.5 border-b border-rule py-3 transition-colors duration-fast hover:bg-sunken/70">
                  <div className="w-12 shrink-0">
                    <Poster path={item.posterPath} title={item.title} size="w92" seed={item.titleId} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display truncate text-[1.0625rem] leading-tight">
                      {item.title}
                      {seasonTag(item.seasonNumber) ? <span className="text-brand"> · {seasonTag(item.seasonNumber)}</span> : null}
                    </p>
                    <p className="font-micro mt-1 text-[0.6875rem] text-soft">{dayLabel(item.date)}</p>
                    {item.review ? <p className="mt-1.5 line-clamp-2 text-sm leading-snug">{item.review}</p> : null}
                  </div>
                  {item.rating !== null ? <Stamp value={item.rating} size="sm" accent={data.profile.accent} /> : null}
                </Link>
              </li>
            ))}
          </ol>
        )}
      </Block>
    </div>
  );
}
