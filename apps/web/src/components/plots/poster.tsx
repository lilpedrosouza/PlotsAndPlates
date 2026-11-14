import { type TmdbImageSize, tmdbImage } from "@pap/shared";
import Image from "next/image";
import type { CSSProperties } from "react";
import { PosterArt } from "@/components/art/poster-art";
import { cn } from "@/lib/utils";

const WIDTH: Record<TmdbImageSize, number> = { w92: 92, w185: 185, w342: 342, w500: 500, w780: 780, w1280: 1280 };
const VARIANTS = ["sol", "escada", "olho"] as const;

/** Arte de cartaz estável por título, para quando o TMDB não tem pôster. */
const variantFor = (seed: string) => VARIANTS[[...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0) % VARIANTS.length]!;

/**
 * Pôster 2:3 de canto vivo. A imagem vem direto do servidor do TMDB no tamanho
 * certo (sem passar pelo otimizador da Vercel); sem pôster, a arte do mundo.
 */
export function Poster({
  path,
  title,
  size = "w342",
  seed,
  priority,
  className,
  style,
}: {
  path: string | null | undefined;
  title: string;
  size?: TmdbImageSize;
  seed?: string;
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const src = tmdbImage(path, size);
  return (
    <div className={cn("relative aspect-[2/3] overflow-hidden bg-sunken", className)} style={style}>
      {src ? (
        <Image
          src={src}
          alt={`Pôster de ${title}`}
          width={WIDTH[size]}
          height={Math.round(WIDTH[size] * 1.5)}
          unoptimized
          priority={priority}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <PosterArt variant={variantFor(seed ?? title)} className="absolute inset-0" />
      )}
    </div>
  );
}
