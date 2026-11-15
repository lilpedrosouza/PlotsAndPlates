"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { lastSection } from "@/lib/section";

/**
 * Volta do Google ou do link de confirmação. O cliente do Supabase troca o
 * código da URL pela sessão sozinho; aqui só esperamos e seguimos em frente.
 */
export function AuthCallback() {
  const router = useRouter();
  const auth = useAuth();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (auth.status === "in") {
      router.replace(`/${lastSection()}`);
      return;
    }
    const timer = setTimeout(() => setFailed(true), 6000);
    return () => clearTimeout(timer);
  }, [auth.status, router]);

  return (
    <div data-theme="plates" className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      {failed ? (
        <div role="alert" className="flex flex-col items-center gap-3">
          <p className="text-lg font-semibold">O login não se completou.</p>
          <Link href="/entrar" className="font-semibold text-brand underline">
            Voltar para a entrada
          </Link>
        </div>
      ) : (
        <p role="status" className="font-micro text-sm text-soft">
          Entrando…
        </p>
      )}
    </div>
  );
}
