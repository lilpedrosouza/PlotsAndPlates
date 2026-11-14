"use client";

import type { Session } from "@supabase/supabase-js";
import { type ReactNode, createContext, use, useEffect, useState } from "react";
import { isConfigured } from "./env";
import { getSupabase } from "./supabase";

type AuthState =
  | { status: "loading"; session: null }
  | { status: "out"; session: null }
  | { status: "in"; session: Session };

const AuthContext = createContext<AuthState>({ status: "loading", session: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  // Sem Supabase configurado não há sessão para esperar.
  const [state, setState] = useState<AuthState>(
    isConfigured ? { status: "loading", session: null } : { status: "out", session: null },
  );

  useEffect(() => {
    if (!isConfigured) return;
    const supabase = getSupabase();
    const apply = (session: Session | null) =>
      setState(session ? { status: "in", session } : { status: "out", session: null });

    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => apply(session));
    return () => data.subscription.unsubscribe();
  }, []);

  return <AuthContext value={state}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
  return use(AuthContext);
}

/** Traduz os erros do Supabase Auth para a voz do PAP. */
export function authMessage(error: { code?: string; message?: string } | null | undefined): string {
  switch (error?.code) {
    case "invalid_credentials":
      return "E-mail ou senha não conferem.";
    case "user_already_exists":
    case "email_exists":
      return "Esse e-mail já tem conta. Que tal entrar?";
    case "weak_password":
      return "A senha precisa de pelo menos 6 caracteres.";
    case "email_not_confirmed":
      return "Falta confirmar o e-mail: procura o link que a gente mandou.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Muitas tentativas seguidas. Espera um pouquinho e tenta de novo.";
    case "validation_failed":
      return "Esse e-mail não parece válido.";
    default:
      return "Não deu certo agora. Tenta de novo?";
  }
}
