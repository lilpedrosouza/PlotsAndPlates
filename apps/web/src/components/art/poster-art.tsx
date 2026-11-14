import { cn } from "@/lib/utils";

type PosterVariant = "sol" | "escada" | "olho";

/**
 * Cartazes de exemplo no traço dos títulos geométricos de cinema: poucas
 * formas, uma cor de acento. São ilustrações de demonstração, não pôsteres
 * de filmes reais.
 */
export function PosterArt({ variant, className }: { variant: PosterVariant; className?: string }) {
  return (
    <svg viewBox="0 0 200 300" role="img" aria-label="Cartaz de exemplo" className={cn("block h-full w-full", className)} preserveAspectRatio="xMidYMid slice">
      <rect width="200" height="300" fill="var(--pap-sunken)" />
      {variant === "sol" ? (
        <>
          <circle cx="100" cy="118" r="62" fill="var(--pap-accent)" />
          <rect x="0" y="150" width="200" height="150" fill="var(--pap-surface)" />
          <path d="M0 150h200" stroke="var(--pap-ink)" strokeWidth="3" />
          <path d="M20 176h160M44 200h112M68 224h64" stroke="var(--pap-accent)" strokeWidth="5" />
        </>
      ) : null}
      {variant === "escada" ? (
        <>
          <path d="M0 300V236h40V184h40V132h40V80h40V28h40v272z" fill="var(--pap-ink)" />
          <circle cx="60" cy="150" r="13" fill="var(--pap-accent)" />
          <path d="M60 163v30" stroke="var(--pap-accent)" strokeWidth="6" />
        </>
      ) : null}
      {variant === "olho" ? (
        <>
          <path d="M10 150C50 84 150 84 190 150 150 216 50 216 10 150z" fill="var(--pap-ink)" />
          <circle cx="100" cy="150" r="38" fill="var(--pap-accent)" />
          <circle cx="100" cy="150" r="15" fill="var(--pap-bg)" />
          <path d="M0 40h200M0 260h200" stroke="var(--pap-rule-strong)" strokeWidth="2" />
        </>
      ) : null}
    </svg>
  );
}
