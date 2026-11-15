"use client";

import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import type { ReactNode } from "react";
import { useSection } from "@/components/shell/section-context";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type DeckPhase = "idle" | "shuffling" | "revealed";

const STACK = 5;
const TILTS = [-4, 3, -2, 4, -1];

/** Verso da carta: o monograma do PAP no material do mundo. */
function CardBack() {
  const section = useSection();
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center",
        section === "plates" ? "frame-label bg-surface" : "border border-rule-strong bg-sunken",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "font-display",
          section === "plates" ? "text-[2.5rem] text-brand italic" : "text-[2rem] tracking-[0.12em] text-brand uppercase",
        )}
      >
        PAP
      </span>
    </div>
  );
}

/**
 * O baralho: até cinco cartas desalinhadas. Ao sortear, abrem em leque e se
 * recolhem duas vezes; a de cima sobe e vira, mostrando o sorteado.
 */
export function Deck({
  phase,
  count,
  front,
  round,
  onShuffled,
}: {
  phase: DeckPhase;
  count: number;
  front: ReactNode;
  /** Cada sorteio é uma carta de cima nova: ela começa de costas e vira de novo. */
  round: number;
  onShuffled: () => void;
}) {
  const section = useSection();
  const reduced = useReducedMotion();
  const visible = Math.max(1, Math.min(STACK, count));
  const shuffling = phase === "shuffling" && !reduced;

  return (
    <div className="relative mx-auto aspect-[2/3] w-[min(15rem,62vw)]" style={{ perspective: 1200 }}>
      {Array.from({ length: visible }, (_, index) => {
        const top = index === visible - 1;
        const side = index % 2 === 0 ? -1 : 1;
        return (
          <m.div
            key={top ? `top-${round}` : index}
            className="absolute inset-0"
            style={{ transformStyle: "preserve-3d", zIndex: index }}
            initial={false}
            animate={
              shuffling
                ? {
                    x: [0, side * 70, 0, side * -46, 0],
                    rotate: [TILTS[index] ?? 0, side * 14, TILTS[index] ?? 0, side * -9, TILTS[index] ?? 0],
                  }
                : top && phase === "revealed"
                  ? { x: 0, y: -12, rotate: 0, rotateY: reduced ? 0 : 180, opacity: 1 }
                  : { x: 0, y: 0, rotate: TILTS[index] ?? 0, rotateY: 0, opacity: phase === "revealed" && reduced && top ? 0 : 1 }
            }
            transition={
              shuffling
                ? { duration: 1.1, ease: "easeInOut", delay: index * 0.03 }
                : phase === "revealed"
                  ? SPRING[section].settle
                  : { duration: 0.2 }
            }
            onAnimationComplete={() => {
              if (shuffling && top) onShuffled();
            }}
          >
            {top && phase === "revealed" ? (
              reduced ? (
                <m.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {front}
                </m.div>
              ) : (
                <>
                  <div className="absolute inset-0" style={{ backfaceVisibility: "hidden" }}>
                    <CardBack />
                  </div>
                  <div className="absolute inset-0" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                    {front}
                  </div>
                </>
              )
            ) : (
              <CardBack />
            )}
          </m.div>
        );
      })}
    </div>
  );
}
