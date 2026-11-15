"use client";

import { Check } from "lucide-react";
import * as m from "motion/react-m";
import { useState } from "react";
import { useSection } from "@/components/shell/section-context";
import { Button } from "@/components/ui/button";
import { afterPaint } from "@/lib/after-paint";
import { POP } from "@/lib/motion";
import { useFomos } from "@/lib/plates/mutations";
import { useTransitionNavigate } from "@/lib/transition-router";

/**
 * "Fomos!": tira do "quero ir", registra a visita de hoje e leva para a
 * avaliação. O botão carimba (salta e gira) antes de seguir.
 */
export function FomosButton({ restaurantId, size = "md", block }: { restaurantId: string; size?: "md" | "sm"; block?: boolean }) {
  const section = useSection();
  const fomos = useFomos(restaurantId);
  const navigate = useTransitionNavigate();
  const [stamped, setStamped] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    setError(null);
    // O botão fica ocupado na hora; a mutação (com as atualizações otimistas e as
    // invalidações das listas) começa depois que esse retorno aparece na tela.
    setStarting(true);
    afterPaint(() =>
      fomos.mutate(
        {},
        {
          onSuccess: () => {
            setStamped(true);
            setTimeout(() => navigate(`/plates/r/${restaurantId}?avaliar=1`), 420);
          },
          onError: (failure) => setError(failure instanceof Error ? failure.message : "Não deu. Tenta de novo?"),
          onSettled: () => setStarting(false),
        },
      ),
    );
  };

  return (
    <div className={block ? "w-full" : undefined}>
      <m.div
        animate={stamped ? { scale: [1, 1.12, 1], rotate: [0, -5, -2] } : { scale: 1, rotate: 0 }}
        transition={POP[section]}
        className={block ? "w-full" : "inline-block"}
      >
        <Button size={size} block={block} busy={starting || fomos.isPending} onClick={onClick} disabled={stamped}>
          {stamped ? <Check aria-hidden /> : null}
          Fomos!
        </Button>
      </m.div>
      {error ? (
        <p role="alert" className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
