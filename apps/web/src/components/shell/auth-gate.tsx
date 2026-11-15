"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useMe } from "@/lib/queries";

/**
 * Só deixa passar quem está logado e já tem perfil. É conforto de navegação:
 * a proteção de verdade é a API, que valida o token em toda chamada.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const auth = useAuth();
  const me = useMe();
  const needsProfile = me.data !== undefined && me.data.profile === null;

  useEffect(() => {
    if (auth.status === "out") router.replace("/entrar");
    else if (needsProfile) router.replace("/bem-vindo");
  }, [auth.status, needsProfile, router]);

  if (me.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-4 py-16">
        <h1 className="font-display text-3xl">Não deu para abrir agora</h1>
        <p className="max-w-prose text-soft">{me.error.message}</p>
        <Button variant="secondary" onClick={() => me.refetch()} busy={me.isFetching}>
          Tentar de novo
        </Button>
      </div>
    );
  }

  // A casca da tela aparece já no HTML: títulos e estrutura não esperam a sessão
  // nem o /me. Cada componente mostra o próprio esqueleto até os dados chegarem,
  // e nada é buscado sem sessão (as consultas só rodam com `auth.status === "in"`).
  return children;
}
