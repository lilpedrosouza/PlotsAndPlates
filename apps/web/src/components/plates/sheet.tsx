"use client";

import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Ações fixas no pé da folha (ex.: Salvar). */
  footer?: ReactNode;
};

/**
 * Folha que sobe do pé da tela (no celular) ou aparece centrada (em telas
 * largas). Foco preso dentro, Esc fecha, o fundo escurece. Anima só com
 * transform e opacity.
 */
export function Sheet({ open, onOpenChange, title, description, children, footer }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {/* Sem portal: a folha fica dentro do mundo ([data-theme]) e herda os tokens. */}
        <Dialog.Overlay className="sheet-overlay fixed inset-0 z-50 bg-foreground/35" />
        <Dialog.Content
          className={cn(
            "sheet-content fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col border-t border-rule-strong bg-background shadow-sheet outline-none",
            "rounded-t-lg md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[min(34rem,92vw)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:border",
          )}
        >
          <header className="flex items-start justify-between gap-4 px-page pt-5 pb-3">
            <div className="min-w-0">
              <Dialog.Title className="font-display text-2xl leading-tight">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-soft">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Fechar"
              className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-md text-soft transition-colors duration-fast hover:bg-sunken hover:text-foreground"
            >
              <X aria-hidden className="size-5" />
            </Dialog.Close>
          </header>
          <div className="rule-double mx-[var(--pap-space-page)]" />
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-page py-5">{children}</div>
          {footer ? (
            <footer className="border-t border-rule px-page pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</footer>
          ) : null}
        </Dialog.Content>
    </Dialog.Root>
  );
}
