"use client";

import type { PhotoUploadKind } from "@pap/shared";
import { Camera } from "lucide-react";
import { type ChangeEvent, useId, useState } from "react";
import { IMAGE_ACCEPT } from "@/lib/image";
import { uploadPlatesPhoto } from "@/lib/plates/upload";
import { cn } from "@/lib/utils";

/**
 * Escolher ou tirar uma foto: comprime, sobe e devolve o caminho. Mostra a
 * prévia local na hora (UI otimista) e o erro se o upload falhar.
 */
export function usePhotoUpload(kind: PhotoUploadKind) {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File): Promise<string | null> => {
    setError(null);
    setBusy(true);
    setPreview(URL.createObjectURL(file));
    try {
      return await uploadPlatesPhoto(kind, file);
    } catch (failure) {
      setPreview(null);
      setError(failure instanceof Error ? failure.message : "A foto não subiu. Tenta de novo?");
      return null;
    } finally {
      setBusy(false);
    }
  };

  return { preview, busy, error, upload, clear: () => setPreview(null) };
}

/** Botão de foto pousado sobre a imagem (a única peça com sombra no rótulo). */
export function PhotoButton({
  label,
  busy,
  onFile,
  className,
  multiple,
}: {
  label: string;
  busy?: boolean;
  onFile: (files: File[]) => void;
  className?: string;
  multiple?: boolean;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        "inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-surface px-4 text-sm font-semibold text-foreground shadow-lift",
        "border border-rule-strong transition-colors duration-fast hover:bg-sunken focus-within:outline-2 focus-within:outline-offset-3 focus-within:outline-brand",
        busy && "pointer-events-none opacity-70",
        className,
      )}
    >
      <Camera aria-hidden className="size-[1.1rem]" />
      {busy ? "Enviando…" : label}
      <input
        id={id}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple={multiple}
        className="sr-only"
        disabled={busy}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const files = [...(event.target.files ?? [])];
          event.target.value = "";
          if (files.length > 0) onFile(files);
        }}
      />
    </label>
  );
}
