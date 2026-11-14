"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { lastSection } from "@/lib/section";

export function EntryRedirect() {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (auth.status === "out") router.replace("/entrar");
    else if (auth.status === "in") router.replace(`/${lastSection()}`);
  }, [auth.status, router]);

  return (
    <div data-theme="plates" className="flex min-h-dvh items-center justify-center" aria-busy="true">
      <span className="font-micro text-sm text-soft">Abrindo o caderno…</span>
    </div>
  );
}
