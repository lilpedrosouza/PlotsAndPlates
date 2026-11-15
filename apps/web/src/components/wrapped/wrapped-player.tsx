"use client";

import { Share2, X } from "lucide-react";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useParams, useRouter } from "next/navigation";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { useSection } from "@/components/shell/section-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SPRING } from "@/lib/motion";
import { useWrapped } from "@/lib/wrapped/queries";
import { shareStory } from "./share";
import { buildStories } from "./stories";

const STORY_SECONDS = 6;
const HOLD_MS = 220;

/** O ano do casal em stories, por cima de tudo. */
export function WrappedPlayer() {
  const params = useParams<{ ano: string }>();
  const year = Number(params.ano);
  const query = useWrapped(year);
  const section = useSection();
  const router = useRouter();
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [sharing, setSharing] = useState<"idle" | "busy" | "done" | "error">("idle");
  // O story que sai ainda está na árvore durante a troca: acha o atual pelo id.
  const stageRef = useRef<HTMLDivElement>(null);
  const press = useRef<{ at: number; held: boolean; timer: number | null }>({ at: 0, held: false, timer: null });
  const [direction, setDirection] = useState(1);

  const stories = query.data ? buildStories(query.data) : [];
  const count = stories.length;
  const story = stories[Math.min(index, Math.max(0, count - 1))];

  const close = () => {
    if (window.history.length > 1) router.back();
    else router.push(`/${section}/perfil`);
  };
  const go = (step: number) => {
    setDirection(step);
    setSharing("idle");
    setIndex((current) => {
      const next = current + step;
      if (next < 0) return 0;
      if (next >= count) return current;
      return next;
    });
  };

  // Tela cheia de verdade: a página de trás não rola.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") go(1);
      else if (event.key === "ArrowLeft") go(-1);
      else if (event.key === "Escape") close();
      else if (event.key === " ") {
        event.preventDefault();
        setPaused((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onPointerDown = () => {
    press.current = {
      at: Date.now(),
      held: false,
      timer: window.setTimeout(() => {
        press.current.held = true;
        setPaused(true);
      }, HOLD_MS),
    };
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (press.current.timer) window.clearTimeout(press.current.timer);
    if (press.current.held) {
      setPaused(false);
      return;
    }
    const { left, width } = event.currentTarget.getBoundingClientRect();
    go(event.clientX - left < width / 3 ? -1 : 1);
  };

  const share = async () => {
    const node = stageRef.current?.querySelector<HTMLElement>(`[data-story="${story?.id}"]`);
    if (!node) return;
    setSharing("busy");
    setPaused(true);
    try {
      await shareStory(node, `pap-wrapped-${year}-${story?.id ?? "story"}.png`);
      setSharing("done");
    } catch {
      setSharing("error");
    } finally {
      setPaused(false);
    }
  };

  // Nos stories divididos, o topo é creme (Plates) e o pé é preto (Plots).
  const topChrome = story?.world === "plots" ? "plots" : "plates";
  const bottomChrome = story?.world === "plates" ? "plates" : "plots";

  return (
    <div role="dialog" aria-modal="true" aria-label={`PAP Wrapped ${year}`} className="fixed inset-0 z-[70] bg-black">
      <div ref={stageRef} className="relative mx-auto h-full w-full max-w-[min(100vw,calc(100dvh*9/16))] overflow-hidden">
        {query.isPending ? (
          <Skeleton className="absolute inset-0 rounded-none" />
        ) : query.isError || !story ? (
          <div data-theme={section} className="absolute inset-0 flex flex-col items-start justify-center gap-4 bg-background px-8 text-foreground">
            <h1 className="font-display text-3xl leading-tight">Não deu para abrir o Wrapped de {Number.isFinite(year) ? year : "esse ano"}</h1>
            <Button variant="secondary" onClick={close}>
              Voltar
            </Button>
          </div>
        ) : (
          <>
            <AnimatePresence initial={false} custom={direction}>
              <m.div
                key={story.id}
                data-story={story.id}
                className="absolute inset-0"
                custom={direction}
                initial={reduced ? { opacity: 0 } : { x: `${direction * 100}%` }}
                animate={reduced ? { opacity: 1 } : { x: 0 }}
                exit={reduced ? { opacity: 0 } : { x: `${direction * -30}%`, opacity: 0.4 }}
                transition={reduced ? { duration: 0.2 } : SPRING.plots.settle}
              >
                {story.render()}
              </m.div>
            </AnimatePresence>

            {/* Toques: terço esquerdo volta, o resto avança; segurar pausa. */}
            <div
              aria-hidden
              className="absolute inset-0 z-10 touch-none select-none"
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerCancel={() => setPaused(false)}
            />

            <div data-theme={topChrome} className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-3 px-4 pt-3">
              <div className="flex gap-1" aria-hidden>
                {stories.map((item, position) => (
                  <span key={item.id} className="h-[3px] flex-1 overflow-hidden bg-foreground/25">
                    <span
                      key={position === index ? `${item.id}-run` : item.id}
                      className="block h-full origin-left bg-foreground"
                      style={
                        position < index
                          ? { transform: "scaleX(1)" }
                          : position > index
                            ? { transform: "scaleX(0)" }
                            : reduced
                              ? { transform: "scaleX(1)" }
                              : {
                                  animation: `pap-story-progress ${STORY_SECONDS}s linear forwards`,
                                  animationPlayState: paused ? "paused" : "running",
                                }
                      }
                      onAnimationEnd={() => position === index && go(1)}
                    />
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <p className="font-micro text-[0.75rem] tracking-[0.14em] text-foreground uppercase" aria-live="polite">
                  {index + 1} / {count}
                </p>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Fechar o Wrapped"
                  className="pointer-events-auto -mr-2 flex size-11 items-center justify-center text-foreground"
                >
                  <X aria-hidden className="size-6" />
                </button>
              </div>
            </div>

            <div data-theme={bottomChrome} className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 px-4 pb-4">
              <button
                type="button"
                onClick={() => setPaused((value) => !value)}
                className="font-micro flex h-11 items-center px-2 text-[0.75rem] tracking-[0.12em] text-foreground uppercase"
              >
                {paused ? "Continuar" : "Pausar"}
              </button>
              <button
                type="button"
                onClick={share}
                disabled={sharing === "busy"}
                className="font-micro flex h-11 items-center gap-2 px-2 text-[0.75rem] tracking-[0.12em] text-foreground uppercase disabled:opacity-60"
              >
                <Share2 aria-hidden className="size-4" />
                {sharing === "busy" ? "Gerando…" : sharing === "done" ? "Pronto" : sharing === "error" ? "Tentar de novo" : "Compartilhar"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
