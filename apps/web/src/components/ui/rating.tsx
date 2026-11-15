"use client";

import { RATING_MAX, RATING_MIN, RATING_STEP, formatRating } from "@pap/shared";
import * as m from "motion/react-m";
import { useId, useRef, useState } from "react";
import { useSection } from "@/components/shell/section-context";
import { POP } from "@/lib/motion";
import { cn } from "@/lib/utils";

const STAR_PATH = "M12 2.6l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.6l-5.9 3.2 1.2-6.6-4.8-4.6 6.6-.9z";

type StarProps = { fill: 0 | 0.5 | 1; size: number };

/** Uma estrela com preenchimento vazio, meio ou cheio. */
function Star({ fill, size }: StarProps) {
  const clipId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="block overflow-visible">
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={fill === 0.5 ? 12 : 24} height="24" />
        </clipPath>
      </defs>
      <path d={STAR_PATH} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" className="text-rule-strong" />
      {fill > 0 ? (
        <path d={STAR_PATH} fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" clipPath={`url(#${clipId})`} className="text-star" />
      ) : null}
    </svg>
  );
}

const fillFor = (value: number, index: number): 0 | 0.5 | 1 => {
  const diff = value - index;
  return diff >= 1 ? 1 : diff >= 0.5 ? 0.5 : 0;
};

/** Nota só para leitura. */
export function RatingStars({ value, size = 18, className }: { value: number | null; size?: number; className?: string }) {
  const shown = value ?? 0;
  return (
    <span
      role="img"
      aria-label={value === null ? "Sem nota" : `Nota ${formatRating(value)} de 5`}
      className={cn("inline-flex items-center gap-0.5", className)}
    >
      {[0, 1, 2, 3, 4].map((index) => (
        <Star key={index} fill={fillFor(shown, index)} size={size} />
      ))}
    </span>
  );
}

type RatingInputProps = {
  value: number | null;
  onChange: (value: number | null) => void;
  label: string;
  size?: number;
  className?: string;
};

/**
 * Nota de 0,5 a 5 em meia estrela. Toque na metade esquerda ou direita de cada
 * estrela; no teclado funciona como um controle deslizante (setas, Home, End).
 * Tocar de novo na nota atual limpa a nota.
 */
export function RatingInput({ value, onChange, label, size = 36, className }: RatingInputProps) {
  const section = useSection();
  const [preview, setPreview] = useState<number | null>(null);
  const [popped, setPopped] = useState<number | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const shown = preview ?? value ?? 0;

  const commit = (next: number | null) => {
    onChange(next);
    setPopped(next === null ? null : Math.ceil(next) - 1);
  };

  // A nota sai da estrela tocada, não da largura da caixa: dentro de uma coluna
  // flexível a caixa estica até a linha toda e as estrelas ficam só no começo dela
  // (tocar na 4ª estrela dava 2, e era preciso tocar no branco à direita).
  const valueFromPointer = (clientX: number): number => {
    const stars = track.current ? [...track.current.querySelectorAll<HTMLElement>("[data-star]")] : [];
    if (stars.length === 0) return RATING_MIN;
    for (const [index, star] of stars.entries()) {
      const rect = star.getBoundingClientRect();
      // O vão entre as estrelas conta para a estrela da esquerda.
      const right = stars[index + 1]?.getBoundingClientRect().left ?? rect.right;
      if (clientX < right) {
        const half = clientX < rect.left + rect.width / 2 ? 0.5 : 1;
        return Math.min(RATING_MAX, Math.max(RATING_MIN, index + half));
      }
    }
    return RATING_MAX;
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const current = value ?? 0;
    let next: number | null | undefined;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next = Math.min(RATING_MAX, current + RATING_STEP);
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = current - RATING_STEP < RATING_MIN ? null : current - RATING_STEP;
    else if (event.key === "Home") next = RATING_MIN;
    else if (event.key === "End") next = RATING_MAX;
    else if (event.key === "Backspace" || event.key === "Delete") next = null;
    if (next === undefined) return;
    event.preventDefault();
    commit(next);
  };

  return (
    <div
      ref={track}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={RATING_MAX}
      aria-valuenow={value ?? 0}
      aria-valuetext={value === null ? "Sem nota" : `${formatRating(value)} de 5`}
      onKeyDown={onKeyDown}
      onPointerMove={(event) => event.pointerType === "mouse" && setPreview(valueFromPointer(event.clientX))}
      onPointerLeave={() => setPreview(null)}
      onClick={(event) => {
        const next = valueFromPointer(event.clientX);
        commit(next === value ? null : next);
        setPreview(null);
      }}
      className={cn("inline-flex w-fit cursor-pointer touch-manipulation items-center gap-1 py-1", className)}
    >
      {[0, 1, 2, 3, 4].map((index) => (
        <m.span
          key={index}
          data-star
          className="block"
          animate={popped === index ? { scale: [1, 1.32, 1], rotate: [0, -8, 0] } : { scale: 1, rotate: 0 }}
          transition={POP[section]}
          onAnimationComplete={() => popped === index && setPopped(null)}
        >
          <Star fill={fillFor(shown, index)} size={size} />
        </m.span>
      ))}
    </div>
  );
}
