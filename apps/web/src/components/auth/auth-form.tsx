"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { authMessage, useAuth } from "@/lib/auth";
import { isConfigured } from "@/lib/env";
import { getSupabase } from "@/lib/supabase";

type Mode = "entrar" | "cadastro";

const COPY: Record<Mode, { title: string; submit: string; switchText: string; switchLink: string; switchHref: string }> = {
  entrar: {
    title: "Entrar",
    submit: "Entrar",
    switchText: "Primeira vez por aqui?",
    switchLink: "Criar conta",
    switchHref: "/cadastro",
  },
  cadastro: {
    title: "Criar conta",
    submit: "Criar minha conta",
    switchText: "Já tem conta?",
    switchLink: "Entrar",
    switchHref: "/entrar",
  },
};

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const auth = useAuth();
  const copy = COPY[mode];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<"form" | "google" | null>(null);

  // Quem já está logado não precisa ver a porta.
  useEffect(() => {
    if (auth.status === "in") router.replace("/");
  }, [auth.status, router]);

  if (!isConfigured) {
    return (
      <div role="alert" className="flex flex-col gap-2">
        <h2 className="font-display text-2xl">Falta ligar o Supabase</h2>
        <p className="text-soft">
          Copie <code className="font-semibold text-foreground">apps/web/.env.example</code> para{" "}
          <code className="font-semibold text-foreground">.env.local</code> e preencha a URL e a chave publicável. O passo a
          passo está no README.
        </p>
      </div>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Confere o e-mail: ele precisa ser algo como voce@exemplo.com.");
      return;
    }
    if (password.length < 6) {
      setError("A senha precisa de pelo menos 6 caracteres.");
      return;
    }
    setPending("form");
    const supabase = getSupabase();
    const result =
      mode === "entrar"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
          });
    setPending(null);

    if (result.error) {
      setError(authMessage(result.error));
      return;
    }
    if (!result.data.session) {
      setNotice("Quase lá: mandamos um link de confirmação para o seu e-mail.");
      return;
    }
    router.replace("/");
  };

  const google = async () => {
    setError(null);
    setPending("google");
    const { error: oauthError } = await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) {
      setPending(null);
      setError(authMessage(oauthError));
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <h2 className={mode === "entrar" ? "sr-only" : "font-display text-[1.75rem] leading-none"}>{copy.title}</h2>

      <TextField
        label="E-mail"
        type="email"
        name="email"
        autoComplete="email"
        inputMode="email"
        placeholder="voce@exemplo.com"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <TextField
        label="Senha"
        type="password"
        name="password"
        autoComplete={mode === "entrar" ? "current-password" : "new-password"}
        hint={mode === "cadastro" ? "Pelo menos 6 caracteres." : undefined}
        required
        minLength={6}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      {error ? (
        <p role="alert" className="font-medium text-danger">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="font-medium text-second">
          {notice}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 pt-1">
        <Button type="submit" block busy={pending === "form"} disabled={pending === "google"}>
          {copy.submit}
        </Button>
        <Button type="button" variant="secondary" block busy={pending === "google"} disabled={pending === "form"} onClick={google}>
          <GoogleMark />
          Continuar com o Google
        </Button>
      </div>

      <p className="text-soft">
        {copy.switchText}{" "}
        <Link href={copy.switchHref} className="font-semibold text-brand underline">
          {copy.switchLink}
        </Link>
      </p>
    </form>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-[1.05em]">
      <path
        fill="currentColor"
        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
      />
    </svg>
  );
}
