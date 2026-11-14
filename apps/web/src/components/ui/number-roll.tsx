"use client";

import * as m from "motion/react-m";
import { useSection } from "@/components/shell/section-context";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * Número que troca dígito por dígito: cada algarismo é uma coluna de 0 a 9 que
 * desliza até o valor certo (só transform). Leitores de tela recebem o texto
 * inteiro de uma vez.
 */
export function NumberRoll({ value, className }: { value: string; className?: string }) {
  const section = useSection();
  return (
    <span className={cn("inline-flex tabular-nums leading-none", className)}>
      <span className="sr-only">{value}</span>
      <span aria-hidden className="inline-flex">
        {[...value].map((char, position) =>
          /\d/.test(char) ? (
            // A posição identifica a coluna: é ela que persiste enquanto o dígito gira.
            // biome-ignore lint/suspicious/noArrayIndexKey: colunas posicionais
            <span key={position} className="relative inline-block h-[1em] overflow-hidden">
              <m.span
                className="flex flex-col"
                initial={false}
                animate={{ y: `${-Number(char) * 10}%` }}
                transition={SPRING[section].settle}
              >
                {DIGITS.map((digit) => (
                  <span key={digit} className="block h-[1em]">
                    {digit}
                  </span>
                ))}
              </m.span>
            </span>
          ) : (
            // biome-ignore lint/suspicious/noArrayIndexKey: separador posicional
            <span key={position} className="block h-[1em]">
              {char}
            </span>
          ),
        )}
      </span>
    </span>
  );
}
