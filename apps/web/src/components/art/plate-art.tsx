import { cn } from "@/lib/utils";

/**
 * Gravura de um prato visto de cima, em duas tintas, no traço de rótulo
 * impresso. É o desenho que ocupa o arco enquanto não há foto.
 */
export function PlateArt({ className, variant = "massa" }: { className?: string; variant?: "massa" | "vazio" }) {
  return (
    <svg viewBox="0 0 200 250" role="img" aria-label="Ilustração de um prato" className={cn("block", className)} preserveAspectRatio="xMidYMid slice">
      <rect width="200" height="250" fill="var(--pap-sunken)" />
      <g fill="none" stroke="var(--pap-second)" strokeWidth="2" strokeLinecap="round">
        <circle cx="100" cy="138" r="70" fill="var(--pap-surface)" />
        <circle cx="100" cy="138" r="52" strokeWidth="1.2" />
        <circle cx="100" cy="138" r="64" strokeWidth="0.8" strokeDasharray="1 5" />
      </g>
      {variant === "massa" ? (
        <g fill="none" stroke="var(--pap-accent)" strokeWidth="2.4" strokeLinecap="round" transform="translate(0 30)">
          <path d="M70 104c8-18 30-24 44-12s10 30-6 34-30-6-26-18 22-12 26-2-8 14-14 8" />
          <path d="M82 124c10 8 28 8 38-2" />
          <path d="M76 96c6-10 20-16 34-12" strokeWidth="1.6" />
          <circle cx="118" cy="92" r="4.5" fill="var(--pap-accent)" stroke="none" />
          <circle cx="88" cy="118" r="3.5" fill="var(--pap-accent)" stroke="none" />
          <path d="M104 86c2-6 8-8 12-6M96 130c-4 3-9 2-11-1" stroke="var(--pap-second)" strokeWidth="2" />
        </g>
      ) : (
        <g fill="none" stroke="var(--pap-rule-strong)" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="3 6">
          <circle cx="100" cy="138" r="30" />
        </g>
      )}
    </svg>
  );
}
