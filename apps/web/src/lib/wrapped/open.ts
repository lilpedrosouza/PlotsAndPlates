import { useEffect, useSyncExternalStore } from "react";

/**
 * O Wrapped está aberto? Os stories cobrem a tela inteira, e o aviso de
 * conquista (montado nos layouts) espera eles fecharem para aparecer.
 */
let open = 0;
const listeners = new Set<() => void>();
const emit = () => {
  for (const listener of listeners) listener();
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Marca o Wrapped como aberto enquanto o componente estiver montado. */
export function useMarkWrappedOpen() {
  useEffect(() => {
    open++;
    emit();
    return () => {
      open--;
      emit();
    };
  }, []);
}

export function useWrappedOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => open > 0,
    () => false,
  );
}
