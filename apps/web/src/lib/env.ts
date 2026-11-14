/** Só a origem (https://xxx.supabase.co), mesmo se a URL vier com caminho como /rest/v1/. */
function originOf(value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

/** Endereço absoluto da API, mesmo se a variável vier sem protocolo (ex.: xxx.up.railway.app). */
function absoluteUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed || /^https?:\/\//i.test(trimmed)) return trimmed;
  const isLocal = /^(localhost|127\.0\.0\.1)(:|$)/.test(trimmed);
  return `${isLocal ? "http" : "https"}://${trimmed}`;
}

/** Variáveis públicas do site. Nenhum segredo passa por aqui. */
export const env = {
  apiUrl: absoluteUrl(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787"),
  supabaseUrl: originOf(absoluteUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")),
  /** Chave publicável (sb_publishable_...). É pública por natureza. */
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
};

export const isConfigured = Boolean(env.supabaseUrl && env.supabaseKey);
