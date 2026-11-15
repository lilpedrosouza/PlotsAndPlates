"use client";

import { type AchievementKey, achievementByKey } from "@pap/shared";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useState } from "react";
import { useSection } from "@/components/shell/section-context";
import { Button } from "@/components/ui/button";
import { useMarkSeen, useMyAchievements } from "@/lib/achievements/queries";
import { SPRING } from "@/lib/motion";
import { useWrappedOpen } from "@/lib/wrapped/open";
import { cn } from "@/lib/utils";
import { AchievementBadge } from "./badge";

const MAX_FAN = 8;

/**
 * Fechadas nesta visita ao site. Fica fora do componente porque cada mundo
 * monta o próprio aviso: trocar de mundo não pode trazer de volta o que
 * acabou de ser fechado enquanto a marcação de "vista" ainda viaja.
 */
const dismissedThisVisit = new Set<AchievementKey>();

/**
 * Desbloqueio: as conquistas ganhas que a pessoa ainda não viu. Uma só: o selo
 * carimba (Plates) ou a placa acende (Plots). Várias de uma vez (quem já tinha
 * dados): "Vocês já tinham N conquistas!" com os selos em leque.
 */
export function UnlockOverlay() {
  const section = useSection();
  const reduced = useReducedMotion();
  const query = useMyAchievements();
  const markSeen = useMarkSeen();
  const [shown, setShown] = useState<AchievementKey[] | null>(null);
  const wrappedOpen = useWrappedOpen();

  // Com o Wrapped na tela, o aviso espera (ele abriria por baixo dos stories).
  const unseen = wrappedOpen
    ? []
    : (query.data?.items ?? []).filter((item) => item.unlockedAt && !item.seen && !dismissedThisVisit.has(item.key)).map((item) => item.key);
  const pending = unseen.join(",");

  // Guarda o lote que apareceu: o que destravar enquanto ele está aberto vem no próximo.
  if (!shown && pending) setShown(pending.split(",") as AchievementKey[]);

  const close = () => {
    if (shown) {
      markSeen.mutate(shown);
      for (const key of shown) dismissedThisVisit.add(key);
    }
    setShown(null);
  };

  const single = shown?.length === 1 ? achievementByKey(shown[0]!) : null;
  const drop = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
    : section === "plates"
      ? { initial: { opacity: 0, scale: 1.6, rotate: 0 }, animate: { opacity: 1, scale: 1, rotate: -8 } }
      : { initial: { opacity: 0 }, animate: { opacity: [0, 1, 0.4, 1] } };

  return (
    <AnimatePresence>
      {shown ? (
        <m.div
          key="unlock"
          role="dialog"
          aria-modal="true"
          aria-labelledby="desbloqueio-titulo"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 px-page"
          onKeyDown={(event) => event.key === "Escape" && close()}
        >
          <div
            className={cn(
              "flex w-full max-w-sm flex-col items-center gap-5 bg-background px-6 pt-8 pb-6 text-center shadow-sheet",
              section === "plates" ? "frame-label" : "border border-rule-strong",
            )}
          >
            {single ? (
              <>
                <m.div {...drop} transition={reduced ? { duration: 0.2 } : section === "plates" ? SPRING.plates.pop : { duration: 0.6, times: [0, 0.3, 0.55, 1] }}>
                  <AchievementBadge achievementKey={single.key} unlocked size={140} />
                </m.div>
                <div className="flex flex-col gap-2">
                  <h2 id="desbloqueio-titulo" className="font-display text-[1.75rem] leading-tight">
                    {single.name}
                  </h2>
                  <p className="leading-relaxed text-soft">{single.description}</p>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-wrap justify-center gap-2">
                  {shown.slice(0, MAX_FAN).map((key, index) => (
                    <m.div
                      key={key}
                      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24, rotate: (index % 2 ? 1 : -1) * 10 }}
                      animate={{ opacity: 1, y: 0, rotate: 0 }}
                      transition={reduced ? { duration: 0.2 } : { ...SPRING[section].settle, delay: index * 0.07 }}
                    >
                      <AchievementBadge achievementKey={key} unlocked size={56} />
                    </m.div>
                  ))}
                  {shown.length > MAX_FAN ? <span className="font-micro self-center text-[0.875rem] text-soft">+{shown.length - MAX_FAN}</span> : null}
                </div>
                <h2 id="desbloqueio-titulo" className="font-display text-[1.75rem] leading-tight">
                  {`Vocês já tinham ${shown.length} conquistas!`}
                </h2>
                <p className="leading-relaxed text-soft">Todas estão no seu perfil, com o que falta para as próximas.</p>
              </>
            )}
            <Button block onClick={close} autoFocus>
              Que demais!
            </Button>
          </div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
