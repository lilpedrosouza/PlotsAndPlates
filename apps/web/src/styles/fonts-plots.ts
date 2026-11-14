import { Jost } from "next/font/google";

/** Futura de cartaz: títulos e texto de Plots. */
export const jost = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
  display: "swap",
});

export const plotsFonts = jost.variable;
