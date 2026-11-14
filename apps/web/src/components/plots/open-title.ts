"use client";

import type { MouseEvent } from "react";
import { useTransitionNavigate } from "@/lib/transition-router";

/** Nome da View Transition do pôster que viaja até a página do título. */
export const POSTER_TRANSITION = "plots-poster";

/** Abre a página do título fazendo o pôster tocado virar o pôster da página. */
export function useOpenTitle() {
  const navigate = useTransitionNavigate();
  return (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    const poster = event.currentTarget.querySelector<HTMLElement>("[data-poster]");
    if (poster) poster.style.viewTransitionName = POSTER_TRANSITION;
    navigate(href, { types: ["to-detail"] });
  };
}
