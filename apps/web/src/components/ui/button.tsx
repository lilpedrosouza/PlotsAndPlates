"use client";

import { type VariantProps, cva } from "class-variance-authority";
import * as m from "motion/react-m";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Botão nos dois mundos. Em Plates é uma etiqueta impressa (canto de 4px, fio
 * interno); em Plots é um bloco de cartaz em caixa alta. O acento fica só na
 * ação principal.
 */
export const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap select-none",
    "rounded-md font-semibold outline-none duration-fast",
    // Encolhe ao apertar com CSS (compositor). O whileTap do Motion atrasava a apresentação
    // do quadro do toque em até ~180 ms com a CPU lenta (Fomos!, Nova visita).
    "transition-[color,background-color,border-color,transform] active:scale-[0.96]",
    "disabled:pointer-events-none disabled:opacity-45 aria-busy:pointer-events-none",
    "[&_svg]:pointer-events-none [&_svg]:size-[1.15em] [&_svg]:shrink-0",
    "plots:uppercase plots:tracking-[0.08em] plots:font-bold",
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-brand text-on-brand",
          "plates:shadow-[inset_0_0_0_3px_var(--pap-accent),inset_0_0_0_4px_color-mix(in_srgb,var(--pap-on-accent)_55%,transparent)]",
          "hover:brightness-110 active:brightness-95",
        ],
        secondary: [
          "bg-transparent text-foreground border border-rule-strong",
          "hover:bg-sunken active:bg-sunken",
        ],
        quiet: "bg-transparent text-foreground hover:bg-sunken",
        danger: "bg-transparent text-danger border border-danger/50 hover:bg-danger/10",
      },
      size: {
        md: "h-12 px-5 text-base plots:text-sm",
        sm: "h-10 px-4 text-sm plots:text-xs",
        icon: "size-11",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = Omit<ComponentProps<typeof m.button>, "children"> &
  VariantProps<typeof buttonVariants> & {
    children?: React.ReactNode;
    /** Mostra o estado de envio e bloqueia novos cliques. */
    busy?: boolean;
  };

export function Button({ className, variant, size, block, busy, children, disabled, ...props }: ButtonProps) {
  return (
    <m.button
      type="button"
      data-slot="button"
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    >
      {busy ? <Spinner /> : null}
      <span className={cn("inline-flex items-center gap-2", busy && "opacity-70")}>{children}</span>
    </m.button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
    />
  );
}
