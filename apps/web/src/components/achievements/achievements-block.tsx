"use client";

import { ACHIEVEMENTS, type AchievementState, achievementByKey } from "@pap/shared";
import { useState } from "react";
import { Sheet } from "@/components/plates/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyAchievements } from "@/lib/achievements/queries";
import { AchievementBadge } from "./badge";

const unlockedDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

/** Ganhas primeiro (mais recente antes); depois as que faltam, pela proximidade da meta. */
function ordered(items: AchievementState[]) {
  const won = items.filter((item) => item.unlockedAt).sort((a, b) => (b.unlockedAt ?? "").localeCompare(a.unlockedAt ?? ""));
  const missing = items.filter((item) => !item.unlockedAt).sort((a, b) => b.progress / b.target - a.progress / a.target);
  return [...won, ...missing];
}

/** Bloco "Conquistas" do perfil, com progresso das que faltam. */
export function AchievementsBlock() {
  const query = useMyAchievements();
  const [open, setOpen] = useState<AchievementState | null>(null);
  const items = query.data?.items ?? [];
  const won = items.filter((item) => item.unlockedAt).length;

  return (
    <section aria-labelledby="conquistas-titulo" className="flex flex-col gap-4 border-t border-rule-strong pt-5">
      <header className="flex items-baseline justify-between gap-3">
        <h2 id="conquistas-titulo" className="font-display text-2xl leading-[1.14]">
          Conquistas
        </h2>
        {query.data ? <span className="font-micro text-[0.75rem] text-soft">{`${won} de ${items.length}`}</span> : null}
      </header>
      {query.isPending ? (
        // Mesma grade do catálogo (16 selos), para o resto do perfil não pular quando ele chegar.
        <ul aria-busy className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4">
          {Array.from({ length: ACHIEVEMENTS.length }, (_, index) => (
            <li key={index} className="flex flex-col items-center gap-2">
              <Skeleton className="size-16 rounded-full" />
              <Skeleton className="h-[1.0625rem] w-20" />
              <Skeleton className="-mt-1 h-[1.03rem] w-12" />
            </li>
          ))}
        </ul>
      ) : query.isError ? (
        <p role="alert" className="text-soft">
          Não deu para carregar as conquistas agora.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4">
          {ordered(items).map((item) => {
            const achievement = achievementByKey(item.key);
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => setOpen(item)}
                  className="flex w-full flex-col items-center gap-2 rounded-sm text-center transition-transform duration-fast active:scale-95"
                >
                  <AchievementBadge achievementKey={item.key} unlocked={Boolean(item.unlockedAt)} size={64} />
                  <span className="text-[0.8125rem] leading-tight font-semibold">{achievement.name}</span>
                  {item.unlockedAt ? null : (
                    <span className="font-micro -mt-1 text-[0.6875rem] text-soft">
                      {item.progress} de {item.target}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {open ? (
        <Sheet open onOpenChange={(next) => !next && setOpen(null)} title={achievementByKey(open.key).name}>
          <div className="flex flex-col items-center gap-4 pb-2 text-center">
            <AchievementBadge achievementKey={open.key} unlocked={Boolean(open.unlockedAt)} size={112} />
            <p className="max-w-[36ch] leading-relaxed">{achievementByKey(open.key).description}</p>
            <p className="font-micro text-[0.75rem] text-soft">
              {open.unlockedAt
                ? `Ganha em ${unlockedDate(open.unlockedAt)}`
                : `${open.progress} de ${open.target} ${achievementByKey(open.key).unit}`}
            </p>
          </div>
        </Sheet>
      ) : null}
    </section>
  );
}
