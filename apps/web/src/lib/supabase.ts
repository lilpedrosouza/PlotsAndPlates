import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { env, isConfigured } from "./env";

let client: Promise<SupabaseClient> | null = null;

/**
 * Cliente do Supabase no navegador: só autenticação e upload assinado.
 * O pacote chega sob demanda, fora do JavaScript da primeira carga: a sessão
 * já guardada é lida direto do localStorage (`storedSession`) e o cliente só
 * é preciso para entrar, sair, renovar o token e subir imagens.
 */
export function loadSupabase(): Promise<SupabaseClient> {
  if (!isConfigured) {
    return Promise.reject(new Error("Supabase não configurado: preencha apps/web/.env.local."));
  }
  client ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(env.supabaseUrl, env.supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
    }),
  );
  return client;
}

/** Onde o supabase-js guarda a sessão (o padrão dele: `sb-<ref do projeto>-auth-token`). */
function storageKey(): string | null {
  try {
    return `sb-${new URL(env.supabaseUrl).hostname.split(".")[0]}-auth-token`;
  } catch {
    return null;
  }
}

/** Folga antes de expirar: um token prestes a vencer passa pelo cliente, que renova. */
const EXPIRY_MARGIN_MS = 60_000;

/**
 * A sessão que o supabase-js deixou no localStorage, se ainda vale por mais
 * de um minuto. Só leitura: renovar e validar continuam com o cliente (e a
 * API confere o token em toda chamada).
 */
export function storedSession(now = Date.now()): Session | null {
  const key = storageKey();
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const session = JSON.parse(raw) as Partial<Session> | null;
    if (!session?.access_token || !session.user || typeof session.expires_at !== "number") return null;
    if (session.expires_at * 1000 - now <= EXPIRY_MARGIN_MS) return null;
    return session as Session;
  } catch {
    return null;
  }
}

/** Token da sessão atual para chamar a API: o guardado, se vale; senão o cliente (que renova). */
export async function accessToken(): Promise<string | null> {
  const stored = storedSession();
  if (stored) return stored.access_token;
  if (!isConfigured) return null;
  const supabase = await loadSupabase();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
