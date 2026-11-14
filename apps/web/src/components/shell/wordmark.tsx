import type { Section } from "@/lib/section";
import { cn } from "@/lib/utils";

/**
 * A marca da seção. "Plates" e "Plots" dividem quatro letras (P, L, T, S): na
 * troca de mundo elas viajam de uma palavra para a outra, enquanto A e E caem
 * e o O entra. Cada letra tem o próprio view-transition-name (em globals.css).
 */
const LETTERS: Record<Section, Array<{ char: string; id: string }>> = {
  plates: [
    { char: "P", id: "p" },
    { char: "l", id: "l" },
    { char: "a", id: "a" },
    { char: "t", id: "t" },
    { char: "e", id: "e" },
    { char: "s", id: "s" },
  ],
  plots: [
    { char: "P", id: "p" },
    { char: "L", id: "l" },
    { char: "O", id: "o" },
    { char: "T", id: "t" },
    { char: "S", id: "s" },
  ],
};

export function Wordmark({ section, className, animated = true }: { section: Section; className?: string; animated?: boolean }) {
  return (
    <span className={cn("font-display inline-flex leading-none", section === "plots" && "tracking-[0.02em]", className)}>
      <span className="sr-only">{section === "plates" ? "Plates" : "Plots"}</span>
      {LETTERS[section].map((letter) => (
        <span key={letter.id} aria-hidden className={cn("inline-block", animated && `vt-wm-${letter.id}`)}>
          {letter.char}
        </span>
      ))}
    </span>
  );
}
