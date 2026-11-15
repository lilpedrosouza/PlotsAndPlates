"use client";

import { ACCENTS, type AccentKey, STREAMINGS, type StreamingKey, type ProfileUploadKind, updateProfileSchema } from "@pap/shared";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Check, LogOut } from "lucide-react";
import Image from "next/image";
import { type ChangeEvent, type FormEvent, useId, useState } from "react";
import { AchievementsBlock } from "@/components/achievements/achievements-block";
import { PartnerBlock } from "@/components/couple/partner-block";
import { useSection } from "@/components/shell/section-context";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChipToggle } from "@/components/ui/chip";
import { TextAreaField, TextField } from "@/components/ui/field";
import { WrappedCard } from "@/components/wrapped/wrapped-card";
import { ApiRequestError } from "@/lib/api";
import { IMAGE_ACCEPT, skipsOptimizer } from "@/lib/image";
import { uploadProfileImage, useMe, useUpdateProfile } from "@/lib/queries";
import { getSupabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const BIO_MAX = 280;

export function ProfileEditor() {
  const section = useSection();
  const queryClient = useQueryClient();
  const profile = useMe().data?.profile;
  const update = useUpdateProfile();

  const [draft, setDraft] = useState<{ displayName: string; username: string; bio: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState<ProfileUploadKind | null>(null);
  const [preview, setPreview] = useState<Partial<Record<ProfileUploadKind, string>>>({});
  const [imageError, setImageError] = useState<string | null>(null);

  if (!profile) return null;

  const values = draft ?? { displayName: profile.displayName, username: profile.username, bio: profile.bio };
  const dirty =
    values.displayName !== profile.displayName || values.username !== profile.username || values.bio !== profile.bio;

  const edit = (patch: Partial<typeof values>) => {
    setDraft({ ...values, ...patch });
    setSaved(false);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = updateProfileSchema.safeParse(values);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0] ?? "_")] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    try {
      await update.mutateAsync(parsed.data);
      setDraft(null);
      setSaved(true);
    } catch (error) {
      if (error instanceof ApiRequestError && Object.keys(error.fields).length) setErrors(error.fields);
      else setErrors({ _: error instanceof Error ? error.message : "Não deu para salvar. Tenta de novo?" });
    }
  };

  // Cor e streamings valem na hora (atualização otimista); texto precisa de "Salvar".
  const setAccent = (accent: AccentKey) => update.mutate({ accent });
  const toggleStreaming = (key: StreamingKey, on: boolean) =>
    update.mutate({ streamings: on ? [...profile.streamings, key] : profile.streamings.filter((item) => item !== key) });

  const pickImage = (kind: ProfileUploadKind) => async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImageError(null);
    setUploading(kind);
    const localUrl = URL.createObjectURL(file);
    setPreview((current) => ({ ...current, [kind]: localUrl }));
    try {
      const path = await uploadProfileImage(kind, file);
      await update.mutateAsync(kind === "avatar" ? { avatarPath: path } : { bannerPath: path });
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "A imagem não subiu. Tenta de novo?");
    } finally {
      setPreview((current) => ({ ...current, [kind]: undefined }));
      URL.revokeObjectURL(localUrl);
      setUploading(null);
    }
  };

  const signOut = async () => {
    await getSupabase().auth.signOut();
    queryClient.clear();
  };

  const bannerSrc = preview.banner ?? profile.bannerUrl;
  const avatarSrc = preview.avatar ?? profile.avatarUrl;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10 pt-2">
      <h1 className="sr-only">Meu perfil</h1>

      {/* Capa + foto */}
      <section aria-label="Fotos do perfil">
        <div className={cn("relative aspect-[16/6] overflow-hidden bg-sunken", section === "plates" ? "frame-label" : "border border-rule")}>
          {bannerSrc ? (
            <Image src={bannerSrc} alt="" fill sizes="(min-width: 672px) 672px, 100vw" className="object-cover" priority unoptimized={skipsOptimizer(bannerSrc)} />
          ) : (
            <span className="font-micro absolute inset-0 flex items-center justify-center text-[0.8125rem] text-soft">Sem capa ainda</span>
          )}
          <ImagePicker kind="banner" label="Trocar capa" busy={uploading === "banner"} onPick={pickImage("banner")} className="absolute right-2 bottom-2" />
        </div>
        <div className="-mt-9 flex items-end gap-4 px-4">
          <div className="relative">
            <Avatar name={profile.displayName} src={avatarSrc} size={88} className="ring-4 ring-background" priority />
            <ImagePicker kind="avatar" label="Trocar foto" busy={uploading === "avatar"} onPick={pickImage("avatar")} iconOnly className="absolute -right-2 -bottom-2" />
          </div>
          <div className="min-w-0 pb-1">
            <p className="font-display truncate text-2xl leading-tight">{profile.displayName}</p>
            <p className="font-micro text-[0.875rem] text-brand">@{profile.username}</p>
          </div>
        </div>
        {imageError ? (
          <p role="alert" className="mt-3 font-medium text-danger">
            {imageError}
          </p>
        ) : null}
      </section>

      <WrappedCard />

      <PartnerBlock />

      <AchievementsBlock />

      {/* Texto */}
      <form onSubmit={save} noValidate className="flex flex-col gap-5">
        <h2 className="font-display text-2xl leading-[1.14]">Sobre você</h2>
        <TextField label="Nome" name="displayName" autoComplete="name" maxLength={50} error={errors.displayName} value={values.displayName} onChange={(event) => edit({ displayName: event.target.value })} />
        <TextField
          label="Username"
          name="username"
          prefix="@"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={20}
          error={errors.username}
          hint="É por ele que te encontram na busca."
          value={values.username}
          onChange={(event) => edit({ username: event.target.value.toLowerCase() })}
        />
        <TextAreaField
          label="Bio"
          name="bio"
          maxLength={BIO_MAX}
          rows={3}
          error={errors.bio}
          aside={`${values.bio.length}/${BIO_MAX}`}
          placeholder="Sempre pede sobremesa? Chora em animação?"
          value={values.bio}
          onChange={(event) => edit({ bio: event.target.value })}
        />
        {errors._ ? (
          <p role="alert" className="font-medium text-danger">
            {errors._}
          </p>
        ) : null}
        <div className="flex items-center gap-4">
          <Button type="submit" busy={update.isPending && dirty} disabled={!dirty}>
            Salvar
          </Button>
          <p role="status" className="inline-flex items-center gap-1.5 text-sm font-semibold text-second">
            {saved && !dirty ? (
              <>
                <Check aria-hidden className="size-4" strokeWidth={2.5} /> Salvo
              </>
            ) : null}
          </p>
        </div>
      </form>

      {/* Cor de destaque */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-display text-2xl leading-[1.14]">Cor de destaque</h2>
          <p className="mt-2 text-soft">Vale só para você e muda na hora. Cada opção tem duas tintas: a de Plates à esquerda, a de Plots à direita.</p>
        </div>
        <AccentPicker value={profile.accent} onChange={setAccent} />
      </section>

      {/* Streamings */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-display text-2xl leading-[1.14]">Streamings que a gente assina</h2>
          <p className="mt-2 text-soft">Em Plots, os títulos disponíveis neles ganham destaque na lista de quero ver.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {STREAMINGS.map((streaming) => (
            <ChipToggle key={streaming.key} pressed={profile.streamings.includes(streaming.key)} onPressedChange={(on) => toggleStreaming(streaming.key, on)}>
              {streaming.name}
            </ChipToggle>
          ))}
        </div>
      </section>

      <section className="border-t border-rule pt-6">
        <Button variant="quiet" size="sm" onClick={signOut} className="-ml-3">
          <LogOut aria-hidden strokeWidth={1.75} />
          Sair da conta
        </Button>
      </section>
    </div>
  );
}

function ImagePicker({ kind, label, busy, onPick, iconOnly, className }: { kind: ProfileUploadKind; label: string; busy: boolean; onPick: (event: ChangeEvent<HTMLInputElement>) => void; iconOnly?: boolean; className?: string }) {
  const id = useId();
  return (
    <span className={className}>
      <input id={id} type="file" accept={IMAGE_ACCEPT} className="peer sr-only" onChange={onPick} disabled={busy} data-kind={kind} />
      <label
        htmlFor={id}
        aria-busy={busy || undefined}
        className={cn(
          "inline-flex cursor-pointer items-center gap-2 border border-rule-strong bg-surface text-sm font-semibold text-foreground shadow-lift transition-colors duration-fast",
          "hover:bg-sunken peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand",
          "plates:rounded-full plots:rounded-none plots:text-xs plots:font-bold plots:uppercase plots:tracking-[0.08em]",
          iconOnly ? "size-11 justify-center" : "h-10 px-3.5",
          busy && "pointer-events-none opacity-70",
        )}
      >
        {busy ? (
          <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" />
        ) : (
          <Camera aria-hidden className="size-[1.1rem]" strokeWidth={1.75} />
        )}
        <span className={cn(iconOnly && "sr-only")}>{busy ? "Enviando…" : label}</span>
      </label>
    </span>
  );
}

function AccentPicker({ value, onChange }: { value: AccentKey; onChange: (value: AccentKey) => void }) {
  return (
    <div role="radiogroup" aria-label="Cor de destaque" className="flex flex-wrap gap-x-3 gap-y-4">
      {ACCENTS.map((accent) => {
        const checked = accent.key === value;
        return (
          <button
            key={accent.key}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(accent.key)}
            className="group flex w-[4.75rem] flex-col items-center gap-2 rounded-sm text-center"
          >
            {/* Cada opção são duas tintas: a de Plates à esquerda, a de Plots à direita. */}
            <span
              className={cn(
                "relative flex size-12 overflow-hidden transition-transform duration-fast group-active:scale-90",
                "plates:rounded-full plots:rounded-none",
                checked ? "ring-2 ring-foreground ring-offset-[3px] ring-offset-background" : "ring-1 ring-rule-strong",
              )}
            >
              <span data-theme="plates" data-accent={accent.key} className="h-full w-1/2 bg-brand" />
              <span data-theme="plots" data-accent={accent.key} className="h-full w-1/2 bg-brand" />
              {checked ? (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex size-6 items-center justify-center rounded-full bg-background text-foreground">
                    <Check aria-hidden className="size-4" strokeWidth={3} />
                  </span>
                </span>
              ) : null}
            </span>
            <span className={cn("text-[0.8125rem] leading-tight", checked ? "font-semibold text-foreground" : "text-soft")}>{accent.label}</span>
          </button>
        );
      })}
    </div>
  );
}
