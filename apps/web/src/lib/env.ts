/** Só a origem (https://xxx.supabase.co), mesmo se a URL vier com caminho como /rest/v1/. */
function originOf(value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

/** Variáveis públicas do site. Nenhum segredo passa por aqui. */
export const env = {
  apiUrl: (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787").replace(/\/+$/, ""),
  supabaseUrl: originOf(process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""),
  /** Chave publicável (sb_publishable_...). É pública por natureza. */
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
};

export const isConfigured = Boolean(env.supabaseUrl && env.supabaseKey);
