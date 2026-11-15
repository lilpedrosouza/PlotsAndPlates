"use client";

import { USERNAME_PATTERN, createProfileSchema } from "@pap/shared";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { lastSection } from "@/lib/section";
import { checkUsername, useCreateProfile, useMe } from "@/lib/queries";
import { loadSupabase } from "@/lib/supabase";

/** Sugere um @username a partir do nome: "Ana Souza" → "ana.souza". */
const suggestUsername = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9_.]/g, "")
    .replace(/^[^a-z]+/, "")
    .slice(0, 20);

type Availability = { state: "idle" | "checking" | "free" } | { state: "taken"; reason: string };
type UsernameCheck = { username: string; available: boolean; reason?: string };

/** Primeiro acesso: a pessoa preenche a própria etiqueta de identificação. */
export function Onboarding() {
  const router = useRouter();
  const auth = useAuth();
  const me = useMe();
  const createProfile = useCreateProfile();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [check, setCheck] = useState<UsernameCheck | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (auth.status === "out") router.replace("/entrar");
    else if (me.data?.profile) router.replace(`/${lastSection()}`);
  }, [auth.status, me.data?.profile, router]);

  const effectiveUsername = usernameTouched ? username : suggestUsername(displayName);
  const formatOk = USERNAME_PATTERN.test(effectiveUsername);

  // Confere a disponibilidade enquanto a pessoa digita, com uma pausa curta.
  useEffect(() => {
    if (!formatOk) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      checkUsername(effectiveUsername)
        .then((result) => !cancelled && setCheck({ username: effectiveUsername, ...result }))
        .catch(() => !cancelled && setCheck(null));
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [effectiveUsername, formatOk]);

  // O estado sai da última conferência: se ela é de outro texto, ainda estamos conferindo.
  const availability: Availability = !formatOk
    ? { state: "idle" }
    : check?.username !== effectiveUsername
      ? { state: "checking" }
      : check.available
        ? { state: "free" }
        : { state: "taken", reason: check.reason ?? "Esse @username já está em uso." };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = createProfileSchema.safeParse({ username: effectiveUsername, displayName });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    try {
      await createProfile.mutateAsync(parsed.data);
      router.replace(`/${lastSection()}`);
    } catch (error) {
      if (error instanceof ApiRequestError) setFieldErrors(Object.keys(error.fields).length ? error.fields : { _: error.message });
      else setFieldErrors({ _: "Não deu certo agora. Tenta de novo?" });
    }
  };

  const usernameError =
    fieldErrors.username ??
    (availability.state === "taken" ? availability.reason : null) ??
    (effectiveUsername && !formatOk ? "De 3 a 20 caracteres: letras minúsculas, números, ponto ou underline, começando por letra." : null);

  return (
    <form onSubmit={submit} noValidate data-porta="compact" className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-[1.75rem] leading-none">Como a gente te chama?</h2>
        <p className="mt-2 text-soft">É o nome que vai no seu rótulo. Dá para mudar depois.</p>
      </div>

      {/* A etiqueta se preenche enquanto a pessoa digita. */}
      <div aria-hidden className="frame-label mx-1 my-1 flex flex-col items-center gap-1 bg-surface px-5 py-5 text-center">
        <span className="font-micro text-[0.75rem] text-soft">Caderno de</span>
        <span className="font-display min-h-[1.2em] max-w-full truncate text-[1.75rem] leading-tight">
          {displayName.trim() || "Seu nome"}
        </span>
        <span className="font-micro text-[0.8125rem] text-brand">@{effectiveUsername || "username"}</span>
      </div>

      <TextField
        label="Nome"
        name="displayName"
        autoComplete="name"
        maxLength={50}
        required
        error={fieldErrors.displayName}
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
      />
      <TextField
        label="Username"
        name="username"
        prefix="@"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={20}
        required
        error={usernameError}
        hint={availability.state === "free" ? "Está livre." : availability.state === "checking" ? "Conferindo…" : "É por ele que te encontram na busca."}
        value={effectiveUsername}
        onChange={(event) => {
          setUsernameTouched(true);
          setUsername(event.target.value.toLowerCase());
        }}
      />

      {fieldErrors._ ? (
        <p role="alert" className="font-medium text-danger">
          {fieldErrors._}
        </p>
      ) : null}

      <Button type="submit" block busy={createProfile.isPending} disabled={!displayName.trim() || !formatOk || availability.state === "taken"}>
        Abrir meu caderno
      </Button>
      <button
        type="button"
        onClick={async () => (await loadSupabase()).auth.signOut()}
        className="self-start text-sm text-soft underline hover:text-foreground"
      >
        Entrar com outra conta
      </button>
    </form>
  );
}
