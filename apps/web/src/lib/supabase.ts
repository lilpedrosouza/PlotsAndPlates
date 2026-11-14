import { type SupabaseClient, createClient } from "@supabase/supabase-js";
import { env, isConfigured } from "./env";

let client: SupabaseClient | null = null;

/** Cliente do Supabase no navegador: só autenticação e upload assinado. */
export function getSupabase(): SupabaseClient {
  if (!isConfigured) {
    throw new Error("Supabase não configurado: preencha apps/web/.env.local.");
  }
  client ??= createClient(env.supabaseUrl, env.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
  });
  return client;
}
