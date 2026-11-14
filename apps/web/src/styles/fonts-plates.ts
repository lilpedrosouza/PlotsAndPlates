import { Besley, Sofia_Sans } from "next/font/google";

/** Clarendon de rótulo: títulos de Plates. */
export const besley = Besley({
  subsets: ["latin"],
  variable: "--font-besley",
  display: "swap",
});

/** Grotesca de letra corrida: texto de Plates. */
export const sofia = Sofia_Sans({
  subsets: ["latin"],
  variable: "--font-sofia",
  display: "swap",
});

export const platesFonts = `${besley.variable} ${sofia.variable}`;
