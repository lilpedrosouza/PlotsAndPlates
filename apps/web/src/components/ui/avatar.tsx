import type { AccentKey } from "@pap/shared";
import Image from "next/image";
import type { Section } from "@/lib/section";
import { skipsOptimizer } from "@/lib/image";
import { cn } from "@/lib/utils";

type AvatarProps = {
  name: string;
  src: string | null;
  size?: number;
  className?: string;
  priority?: boolean;
  /** Cor de destaque de outra pessoa (o par): pinta a inicial com a tinta dela no mundo dado. */
  accent?: AccentKey;
  world?: Section;
};

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

/** Foto de perfil; sem foto, as iniciais em letra de título sobre o acento. */
export function Avatar({ name, src, size = 48, className, priority, accent, world }: AvatarProps) {
  const tinted = accent && world ? { "data-theme": world, "data-accent": accent } : {};
  return (
    <span
      {...tinted}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-brand text-on-brand",
        "plates:rounded-full plots:rounded-none",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image src={src} alt={`Foto de ${name}`} fill sizes={`${size}px`} className="object-cover" priority={priority} unoptimized={skipsOptimizer(src)} />
      ) : (
        <span aria-hidden className="font-display leading-none" style={{ fontSize: size * 0.38 }}>
          {initials(name) || "?"}
        </span>
      )}
    </span>
  );
}
