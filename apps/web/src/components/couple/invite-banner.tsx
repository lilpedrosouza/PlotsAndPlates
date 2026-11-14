"use client";

import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useState } from "react";
import { useSection } from "@/components/shell/section-context";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAnswerInvite, useCouple } from "@/lib/couple/queries";
import { cn } from "@/lib/utils";

/** Aviso no topo do caderno e do diário quando alguém te convidou para ser par. */
export function InviteBanner() {
  const section = useSection();
  const couple = useCouple();
  const answer = useAnswerInvite();
  const [error, setError] = useState<string | null>(null);
  const invite = couple.data && !couple.data.partner ? couple.data.incoming[0] : undefined;

  return (
    <AnimatePresence initial={false}>
      {invite ? (
        <m.aside
          key={invite.id}
          aria-label="Convite para ser par"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "mb-6 flex flex-wrap items-center gap-x-4 gap-y-3 bg-surface p-3.5",
            section === "plates" ? "frame-label" : "border border-rule-strong",
          )}
        >
          <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
            <Avatar name={invite.from.displayName} src={invite.from.avatarUrl} size={40} />
            <p className={cn("min-w-0 leading-snug", section === "plots" && "font-micro text-[0.8125rem] tracking-[0.06em] uppercase")}>
              <span className="font-semibold">{invite.from.displayName}</span> te convidou para ser par
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              busy={answer.isPending && answer.variables?.action === "accept"}
              onClick={() => {
                setError(null);
                answer.mutate({ id: invite.id, action: "accept" }, { onError: (failure) => setError(failure.message) });
              }}
            >
              Aceitar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              busy={answer.isPending && answer.variables?.action === "decline"}
              onClick={() => {
                setError(null);
                answer.mutate({ id: invite.id, action: "decline" }, { onError: (failure) => setError(failure.message) });
              }}
            >
              Recusar
            </Button>
          </div>
          {error ? (
            <p role="alert" className="basis-full font-medium text-danger">
              {error}
            </p>
          ) : null}
        </m.aside>
      ) : null}
    </AnimatePresence>
  );
}
