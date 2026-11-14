/**
 * Cache em memória com validade. Só para o que pode ser guardado: respostas do
 * OpenStreetMap e o mapeamento link do Maps → place_id. Nada de conteúdo do Google.
 */
export type TtlCache<V> = {
  get: (key: string) => V | undefined;
  set: (key: string, value: V) => void;
};

export function createTtlCache<V>(options: { ttlMs: number; max: number; now?: () => number }): TtlCache<V> {
  const entries = new Map<string, { value: V; expiresAt: number }>();
  const now = options.now ?? Date.now;

  return {
    get: (key) => {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= now()) {
        entries.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set: (key, value) => {
      if (entries.size >= options.max) {
        const oldest = entries.keys().next().value;
        if (oldest !== undefined) entries.delete(oldest);
      }
      entries.set(key, { value, expiresAt: now() + options.ttlMs });
    },
  };
}
