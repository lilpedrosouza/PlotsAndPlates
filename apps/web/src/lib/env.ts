/** Variáveis públicas do site. Nenhum segredo passa por aqui. */
export const env = {
  apiUrl: (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787").replace(/\/+$/, ""),
  supabaseUrl: (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, ""),
  /** Chave publicável (sb_publishable_...). É pública por natureza. */
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
};

export const isConfigured = Boolean(env.supabaseUrl && env.supabaseKey);
