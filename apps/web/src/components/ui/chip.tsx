"use client";

import * as m from "motion/react-m";
import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { useSection } from "@/components/shell/section-context";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

type ChipToggleProps = {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  children: ReactNode;
  disabled?: boolean;
};

/** Etiqueta de marcar/desmarcar (filtros, streamings). */
export function ChipToggle({ pressed, onPressedChange, children, disabled }: ChipToggleProps) {
  const section = useSection();
  return (
    <m.button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      whileTap={{ scale: 0.94 }}
      transition={SPRING[section].press}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-md border px-3.5 text-sm font-semibold transition-colors duration-fast",
        "plots:text-xs plots:font-bold plots:uppercase plots:tracking-[0.08em]",
        pressed
          ? "border-foreground bg-foreground text-background"
          : "border-rule-strong bg-transparent text-foreground hover:bg-sunken",
        "disabled:opacity-45",
      )}
    >
      {pressed ? <Check aria-hidden className="size-4" strokeWidth={2.5} /> : null}
      {children}
    </m.button>
  );
}
