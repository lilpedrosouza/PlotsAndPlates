import Image from "next/image";
import type { CSSProperties } from "react";
import { PlateArt } from "@/components/art/plate-art";
import { skipsOptimizer } from "@/lib/image";
import { cn } from "@/lib/utils";

type ArchPhotoProps = {
  src: string | null | undefined;
  alt: string;
  /** Larguras para o `sizes` do next/image. */
  sizes: string;
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
};

/** A foto do rótulo: arco 4:5 sobre o rebaixo; sem foto, a gravura do prato. */
export function ArchPhoto({ src, alt, sizes, priority, className, style }: ArchPhotoProps) {
  return (
    <div className={cn("arch relative aspect-[4/5] overflow-hidden bg-sunken", className)} style={style}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          unoptimized={skipsOptimizer(src)}
          className="object-cover"
        />
      ) : (
        <PlateArt className="absolute inset-0 size-full" />
      )}
    </div>
  );
}
