"use client";

import { formatRating } from "@pap/shared";
import { useSection } from "@/components/shell/section-context";
import { cn } from "@/lib/utils";
import { NumberRoll } from "./number-roll";

type StampProps = {
  value: number | null;
  /** Quem deu a nota, em letra miúda: "você", "ana", "casal". */
  caption?: string;
  size?: "sm" | "md" | "lg";
  /** Giro do carimbo em Plates, em graus (padrão −6°). Cada rótulo pode ter o seu. */
  tilt?: number;
  className?: string;
};

/** `long` é o tamanho do número quando ele tem três algarismos (ex.: 4,25). */
const SIZES = {
  sm: { box: "size-14", number: "text-lg", long: "text-[0.9375rem]", caption: "text-[0.625rem]" },
  md: { box: "size-[4.5rem]", number: "text-2xl", long: "text-xl", caption: "text-[0.6875rem]" },
  lg: { box: "size-24", number: "text-4xl", long: "text-[1.75rem]", caption: "text-xs" },
};

/**
 * A nota como selo. Em Plates é um carimbo redondo, levemente torto, com anel
 * duplo; em Plots é um bloco reto de cartaz preenchido com o acento.
 */
export function Stamp({ value, caption, size = "md", tilt, className }: StampProps) {
  const section = useSection();
  const text = formatRating(value, 2);
  const s = SIZES[size];

  return (
    <span
      role="img"
      style={section === "plates" && tilt !== undefined ? { rotate: `${tilt}deg` } : undefined}
      aria-label={`${caption ? `${caption}: ` : ""}${value === null ? "sem nota" : `nota ${text}`}`}
      className={cn(
        "relative inline-flex shrink-0 flex-col items-center justify-center",
        s.box,
        section === "plates"
          ? "-rotate-6 rounded-full border-2 border-brand text-brand outline outline-1 -outline-offset-[5px] outline-brand/70"
          : "bg-brand text-on-brand",
        value === null && "opacity-60",
        className,
      )}
    >
      <span aria-hidden className={cn("font-display leading-none", text.length >= 4 ? s.long : s.number)}>
        {value === null ? "–" : <NumberRoll value={text} />}
      </span>
      {caption ? (
        <span aria-hidden className={cn("font-micro mt-0.5 leading-none", s.caption)}>
          {caption}
        </span>
      ) : null}
    </span>
  );
}
