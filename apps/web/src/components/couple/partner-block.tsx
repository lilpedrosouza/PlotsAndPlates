"use client";

import { inviteInputSchema } from "@pap/shared";
import { Users } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { useSection } from "@/components/shell/section-context";
import { Button, buttonVariants } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { useAnswerInvite, useCouple, useSendInvite, useUnlinkCouple } from "@/lib/couple/queries";
import { useMe } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { CoupleBilling } from "./couple-billing";

const sinceLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(" de ", " ");

/** Bloco "Par" do perfil: convidar, responder, ver e desfazer o vínculo. */
export function PartnerBlock() {
  const section = useSection();
  const me = useMe().data?.profile;
  const couple = useCouple();
  const answer = useAnswerInvite();
  const unlink = useUnlinkCouple();
  const [error, setError] = useState<string | null>(null);

  if (!me || couple.isPending) {
    return (
      <section aria-busy className="flex flex-col gap-4 border-t border-rule-strong pt-5">
        <h2 className="font-display text-2xl leading-[1.14]">Par</h2>
        <div className="h-14 animate-pulse bg-sunken motion-reduce:animate-none plates:rounded-sm" />
      </section>
    );
  }
  if (couple.isError) {
    return (
      <section className="flex flex-col gap-3 border-t border-rule-strong pt-5">
        <h2 className="font-display text-2xl leading-[1.14]">Par</h2>
        <p role="alert" className="text-soft">
          Não deu para carregar o par agora.
        </p>
      </section>
    );
  }

  const { partner, since, outgoing, incoming } = couple.data;
  const self = { name: me.displayName, avatarUrl: me.avatarUrl };
  const fail = (failure: Error) => setError(failure.message);
  const respond = (id: string, action: "accept" | "decline" | "cancel") => {
    setError(null);
    answer.mutate({ id, action }, { onError: fail });
  };
  const base = section === "plates" ? "/plates" : "/plots";

  let body: React.ReactNode;
  if (partner) {
    body = (
      <>
        <CoupleBilling left={self} right={{ name: partner.displayName, avatarUrl: partner.avatarUrl, accent: partner.accent }} />
        <p className="font-micro text-[0.8125rem] text-soft">
          Juntos no PAP desde {since ? sinceLabel(since) : "hoje"} ·{" "}
          <Link href={`${base}/u/${partner.username}`} className="text-foreground underline decoration-rule-strong underline-offset-4 hover:decoration-brand">
            ver perfil de @{partner.username}
          </Link>
        </p>
        <div>
          <Button
            variant="danger"
            size="sm"
            busy={unlink.isPending}
            onClick={() => {
              if (!window.confirm(`Desfazer o vínculo com ${partner.displayName}? Ninguém perde nada: cada um fica com o que registrou.`)) return;
              setError(null);
              unlink.mutate(undefined, { onError: fail });
            }}
          >
            Desfazer vínculo
          </Button>
        </div>
      </>
    );
  } else if (incoming[0]) {
    const invite = incoming[0];
    body = (
      <>
        <CoupleBilling left={self} right={{ name: invite.from.displayName, avatarUrl: invite.from.avatarUrl }} pending />
        <p className="text-soft">
          <span className="font-semibold text-foreground">{invite.from.displayName}</span> (@{invite.from.username}) quer ser seu par. Vocês vão ver as avaliações privadas um do outro e dividir o quero ir e o quero ver.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button size="sm" busy={answer.isPending && answer.variables?.action === "accept"} onClick={() => respond(invite.id, "accept")}>
            Aceitar
          </Button>
          <Button size="sm" variant="secondary" busy={answer.isPending && answer.variables?.action === "decline"} onClick={() => respond(invite.id, "decline")}>
            Recusar
          </Button>
        </div>
      </>
    );
  } else if (outgoing[0]) {
    const invite = outgoing[0];
    body = (
      <>
        <CoupleBilling left={self} right={{ name: invite.to.displayName, label: `@${invite.to.username}?`, avatarUrl: invite.to.avatarUrl }} pending />
        <p className="text-soft">Convite enviado para {invite.to.displayName}. Quando aceitar, vocês viram par aqui.</p>
        <div>
          <Button size="sm" variant="quiet" className="-ml-3" busy={answer.isPending} onClick={() => respond(invite.id, "cancel")}>
            Cancelar convite
          </Button>
        </div>
      </>
    );
  } else {
    body = <InviteForm />;
  }

  return (
    <section aria-labelledby="par-titulo" className="flex flex-col gap-4 border-t border-rule-strong pt-5">
      <header className="flex items-center justify-between gap-3">
        <h2 id="par-titulo" className="font-display text-2xl leading-[1.14]">
          Par
        </h2>
        <Link href={`${base}/pessoas`} className={cn(buttonVariants({ variant: "quiet", size: "sm" }), "-mr-3")}>
          <Users aria-hidden />
          Pessoas
        </Link>
      </header>
      {body}
      {error ? (
        <p role="alert" className="font-medium text-danger">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function InviteForm() {
  const send = useSendInvite();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | undefined>();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = inviteInputSchema.safeParse({ username });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Confira o @username.");
      return;
    }
    setError(undefined);
    send.mutate(parsed.data.username, {
      onSuccess: () => setUsername(""),
      onError: (failure) => setError(failure.message),
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <p className="text-soft">O par vê suas avaliações privadas e vocês dividem o quero ir e o quero ver. O vínculo só existe depois que a outra pessoa aceitar.</p>
      <div className="flex items-end gap-3">
        <TextField
          label="@username do par"
          name="partner"
          prefix="@"
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          maxLength={21}
          className="min-w-0 flex-1"
          error={error}
          value={username}
          onChange={(event) => setUsername(event.target.value.toLowerCase())}
        />
        <Button type="submit" busy={send.isPending} className={error ? "mb-7" : undefined}>
          Convidar
        </Button>
      </div>
    </form>
  );
}
