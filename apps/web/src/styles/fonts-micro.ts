import { Sofia_Sans_Extra_Condensed } from "next/font/google";

/** Letra miúda condensada: número de catálogo e bloco de créditos, nos dois mundos. */
export const sofiaCondensed = Sofia_Sans_Extra_Condensed({
  subsets: ["latin"],
  // Só o peso usado (600): um arquivo estático é menor que a fonte variável inteira.
  weight: "600",
  variable: "--font-sofia-condensed",
  display: "swap",
});
