"use client";

import { type TitleDetail, type WatchLog, isRewatch, todayIso } from "@pap/shared";
import { Heart } from "lucide-react";
import * as m from "motion/react-m";
import { useState } from "react";
import { TogetherToggle } from "@/components/couple/together-toggle";
import { Sheet } from "@/components/plates/sheet";
import { useSection } from "@/components/shell/section-context";
import { Button } from "@/components/ui/button";
import { ChipToggle } from "@/components/ui/chip";
import { TextAreaField, TextField } from "@/components/ui/field";
import { RatingInput } from "@/components/ui/rating";
import { usePartner } from "@/lib/couple/queries";
import { POP } from "@/lib/motion";
import { useAddLog, useAssistimos, useUpdateLog } from "@/lib/plots/mutations";
import { cn } from "@/lib/utils";

type LogSheetProps = {
  title: TitleDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Temporada já escolhida (botão "Registrar" de uma temporada). */
  presetSeason?: number | null;
  /** Edição de um registro existente. */
  log?: WatchLog | null;
};

/** Temporada sugerida: a primeira (sem contar os especiais) ainda sem nota; senão a última. */
function defaultSeason(title: TitleDetail): number | null {
  const regular = title.seasons.filter((season) => season.number > 0);
  return regular.find((season) => season.myRating === null)?.number ?? regular.at(-1)?.number ?? title.seasons[0]?.number ?? null;
}

/** Curtida: o coração salta quando marca. */
function LikeToggle({ liked, onChange }: { liked: boolean; onChange: (liked: boolean) => void }) {
  const section = useSection();
  return (
    <button
      type="button"
      aria-pressed={liked}
      onClick={() => onChange(!liked)}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-md border px-3.5 text-xs font-bold tracking-[0.08em] uppercase transition-colors duration-fast",
        liked ? "border-brand text-brand" : "border-rule-strong text-foreground hover:bg-sunken",
      )}
    >
      <m.span animate={liked ? { scale: [1, 1.35, 1] } : { scale: 1 }} transition={POP[section]} className="inline-flex">
        <Heart aria-hidden className={cn("size-5", liked && "fill-current")} />
      </m.span>
      Curti
    </button>
  );
}

/**
 * Registro no diário: data, nota, curtida, reassistido, privado e review. Em
 * série, a temporada. No "quero ver", salvar também tira da lista.
 */
export function LogSheet({ title, open, onOpenChange, presetSeason, log }: LogSheetProps) {
  const isShow = title.tmdbType === "tv";
  const [seasonNumber, setSeasonNumber] = useState<number | null>(
    log ? log.seasonNumber : (presetSeason ?? (isShow ? defaultSeason(title) : null)),
  );
  const [watchedOn, setWatchedOn] = useState(log?.watchedOn ?? todayIso());
  const [rating, setRating] = useState<number | null>(log?.rating ?? null);
  const [liked, setLiked] = useState(log?.liked ?? false);
  const [isPrivate, setPrivate] = useState(log?.isPrivate ?? false);
  const [review, setReview] = useState(log?.review ?? "");
  // "Vimos juntos" só na criação: é quando nasce o registro do par.
  const partner = usePartner();
  const showTogether = partner !== null && !log;
  const [together, setTogether] = useState(true);
  // "Reassistido" sugerido pelo histórico; só vai na requisição se a pessoa mexer.
  const suggestedRewatch = log ? log.rewatch : isRewatch(title.logs, seasonNumber);
  const [rewatch, setRewatch] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const add = useAddLog(title.id);
  const assistimos = useAssistimos(title.id);
  const update = useUpdateLog(title.id);
  const busy = add.isPending || assistimos.isPending || update.isPending;

  const save = () => {
    if (isShow && seasonNumber === null) {
      setError("Escolha a temporada.");
      return;
    }
    setError(null);
    const body = {
      watchedOn,
      rating,
      liked,
      isPrivate,
      review,
      seasonNumber: isShow ? seasonNumber : null,
      ...(rewatch !== null ? { rewatch } : {}),
      ...(showTogether ? { together } : {}),
    };
    const done = { onSuccess: () => onOpenChange(false), onError: (failure: Error) => setError(failure.message) };
    if (log) update.mutate({ logId: log.id, patch: body }, done);
    else if (title.inWatchlist) assistimos.mutate(body, done);
    else add.mutate(body, done);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={log ? "Editar registro" : title.inWatchlist ? "Assistimos!" : "Registrar sessão"}
      description={title.title}
      footer={
        <Button block onClick={save} busy={busy}>
          {log ? "Salvar registro" : "Pôr no diário"}
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        {isShow ? (
          <fieldset className="flex flex-col gap-3">
            <legend className="font-micro mb-3 text-[0.8125rem] text-soft">Temporada</legend>
            <div className="flex flex-wrap gap-2">
              {title.seasons.map((season) => (
                <ChipToggle key={season.number} pressed={seasonNumber === season.number} onPressedChange={() => setSeasonNumber(season.number)}>
                  {season.number === 0 ? "Especiais" : `T${season.number}`}
                </ChipToggle>
              ))}
            </div>
          </fieldset>
        ) : null}
        <TextField label="Quando" type="date" value={watchedOn} max={todayIso()} onChange={(event) => setWatchedOn(event.target.value)} />
        {showTogether && partner ? <TogetherToggle partner={partner} label="Vimos juntos" where="diário" value={together} onChange={setTogether} /> : null}
        <div className="flex flex-col gap-1">
          <span className="font-micro text-[0.8125rem] text-soft">{isShow ? "Nota da temporada" : "Nota"}</span>
          <RatingInput label={isShow ? "Nota da temporada" : "Nota"} value={rating} onChange={setRating} />
        </div>
        <div className="flex flex-wrap gap-2">
          <LikeToggle liked={liked} onChange={setLiked} />
          <ChipToggle pressed={rewatch ?? suggestedRewatch} onPressedChange={setRewatch}>
            Reassistido
          </ChipToggle>
          <ChipToggle pressed={isPrivate} onPressedChange={setPrivate}>
            Privado
          </ChipToggle>
        </div>
        <TextAreaField label="Review" value={review} onChange={(event) => setReview(event.target.value)} maxLength={4000} placeholder="O que ficou na cabeça?" />
        {error ? (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}
