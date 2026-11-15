"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ChipToggleProps = {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  children: ReactNode;
  disabled?: boolean;
};

/** Etiqueta de marcar/desmarcar (filtros, streamings). */
export function ChipToggle({ pressed, onPressedChange, children, disabled }: ChipToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border px-3.5 text-sm font-semibold whitespace-nowrap duration-fast",
        // Encolhe ao apertar em CSS, como o Button (o whileTap do Motion atrasava o quadro do toque).
        "transition-[color,background-color,border-color,transform] active:scale-[0.94]",
        "plots:text-xs plots:font-bold plots:uppercase plots:tracking-[0.08em]",
        pressed
          ? "border-foreground bg-foreground text-background"
          : "border-rule-strong bg-transparent text-foreground hover:bg-sunken",
        "disabled:opacity-45",
      )}
    >
      {pressed ? <Check aria-hidden className="size-4" strokeWidth={2.5} /> : null}
      {children}
    </button>
  );
}
