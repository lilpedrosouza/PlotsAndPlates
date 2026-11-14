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

/**
 * Salto de ida e volta (estrela que carimba, "Fomos!"). Usa quadros-chave
 * (1 → maior → 1), que as molas do Motion não aceitam (só dois quadros):
 * por isso é uma curva com sobra em Plates e um corte seco em Plots.
 */
export const POP: Record<Section, Transition> = {
  plates: { duration: 0.46, ease: [0.34, 1.56, 0.64, 1] },
  plots: { duration: 0.3, ease: [0.2, 0, 0, 1] },
};
