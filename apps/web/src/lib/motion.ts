import type { Transition } from "motion/react";
import type { Section } from "./section";

/**
 * Molas de cada mundo. Plates assenta como papel (macia, com uma sobra leve);
 * Plots corta seco, como um corte de montagem.
 */
export const SPRING: Record<Section, { press: Transition; pop: Transition; settle: Transition }> = {
  plates: {
    press: { type: "spring", stiffness: 520, damping: 32, mass: 0.6 },
    pop: { type: "spring", stiffness: 380, damping: 14, mass: 0.7 },
    settle: { type: "spring", stiffness: 260, damping: 24 },
  },
  plots: {
    press: { type: "spring", stiffness: 700, damping: 40, mass: 0.5 },
    pop: { type: "spring", stiffness: 560, damping: 20, mass: 0.6 },
    settle: { type: "spring", stiffness: 420, damping: 36 },
  },
};
