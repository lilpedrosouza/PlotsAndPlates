"use client";

import { type AccentKey, type AchievementKey, achievementByKey } from "@pap/shared";
import {
  CakeSlice,
  Camera,
  Clapperboard,
  Film,
  Gavel,
  Globe,
  Handshake,
  HeartHandshake,
  type LucideIcon,
  MapPinned,
  NotebookPen,
  Repeat,
  Star,
  Tv,
  Users,
  UtensilsCrossed,
  Zap,
} from "lucide-react";
import { useSection } from "@/components/shell/section-context";
import { cn } from "@/lib/utils";

export const ACHIEVEMENT_ICONS: Record<AchievementKey, LucideIcon> = {
  "primeira-mesa": UtensilsCrossed,
  "volta-ao-mundo": Globe,
  fregues: Repeat,
  "explorador-de-bairros": MapPinned,
  "sobremesa-sempre": CakeSlice,
  "caderno-cheio": NotebookPen,
  "primeira-sessao": Clapperboard,
  cinefilo: Film,
  maratonista: Tv,
  documentarista: Camera,
  "top-4": Star,
  "critico-exigente": Gavel,
  "almas-gemeas": HeartHandshake,
  "juntos-sempre": Users,
  "opinioes-fortes": Zap,
  "primeiro-encontro": Handshake,
};

/**
 * A conquista como selo. Em Plates, carimbo redondo de anel duplo; em Plots,
 * placa de letreiro de canto vivo. Bloqueada: contorno tracejado e tinta suave.
 */
export function AchievementBadge({
  achievementKey,
  unlocked,
  size = 72,
  className,
  accent,
}: {
  achievementKey: AchievementKey;
  unlocked: boolean;
  size?: number;
  className?: string;
  /** Conquista de outra pessoa: na cor de destaque dela. */
  accent?: AccentKey;
}) {
  const section = useSection();
  const tint = accent ? { "data-theme": section, "data-accent": accent } : {};
  const Icon = ACHIEVEMENT_ICONS[achievementKey];
  const name = achievementByKey(achievementKey).name;
  const icon = <Icon aria-hidden strokeWidth={1.75} style={{ width: size * 0.42, height: size * 0.42 }} />;

  if (section === "plates") {
    return (
      <span
        {...tint}
        role="img"
        aria-label={`${name}${unlocked ? "" : " (ainda não)"}`}
        style={{ width: size, height: size }}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full",
          unlocked
            ? "-rotate-6 border-2 border-brand text-brand outline outline-1 -outline-offset-[5px] outline-brand/70"
            : "border-2 border-dashed border-rule-strong text-soft/60",
          className,
        )}
      >
        {icon}
      </span>
    );
  }
  return (
    <span
      {...tint}
      role="img"
      aria-label={`${name}${unlocked ? "" : " (ainda não)"}`}
      style={{ width: size * 1.25, height: size }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        unlocked ? "bg-brand text-on-brand" : "border border-dashed border-rule-strong text-soft/60",
        className,
      )}
    >
      {icon}
    </span>
  );
}
