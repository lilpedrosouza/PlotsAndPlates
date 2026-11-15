"use client";

import type {
  CreateProfileInput,
  MeResponse,
  OwnProfile,
  ProfileUploadKind,
  SignedUpload,
  UpdateProfileInput,
} from "@pap/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { useAuth } from "./auth";
import { IMAGE_PRESETS, compressImage } from "./image";
import { loadSupabase } from "./supabase";

export const meKey = ["me"] as const;

/** Sessão atual + perfil. Só busca quando há alguém logado. */
export function useMe() {
  const auth = useAuth();
  return useQuery({
    queryKey: meKey,
    queryFn: () => api<MeResponse>("/me"),
    enabled: auth.status === "in",
    staleTime: 5 * 60_000,
  });
}

export function useCreateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProfileInput) => api<OwnProfile>("/me/profile", { method: "POST", body: input }),
    onSuccess: (profile) => {
      queryClient.setQueryData<MeResponse>(meKey, (current) => (current ? { ...current, profile } : current));
    },
  });
}

/** Edita o perfil com atualização otimista: a tela muda na hora e sincroniza depois. */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => api<OwnProfile>("/me/profile", { method: "PATCH", body: input }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: meKey });
      const previous = queryClient.getQueryData<MeResponse>(meKey);
      if (previous?.profile) {
        // Os caminhos das imagens só viram URL na resposta da API.
        const visible: UpdateProfileInput = { ...input };
        delete visible.avatarPath;
        delete visible.bannerPath;
        queryClient.setQueryData<MeResponse>(meKey, { ...previous, profile: { ...previous.profile, ...visible } });
      }
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(meKey, context.previous);
    },
    onSuccess: (profile) => {
      queryClient.setQueryData<MeResponse>(meKey, (current) => (current ? { ...current, profile } : current));
    },
  });
}

export function checkUsername(username: string) {
  return api<{ available: boolean; reason?: string }>(`/usernames/${encodeURIComponent(username)}`);
}

/** Comprime, sobe direto para o Storage com URL assinada e devolve o caminho. */
export async function uploadProfileImage(kind: ProfileUploadKind, file: Blob): Promise<string> {
  const blob = await compressImage(file, IMAGE_PRESETS[kind]);
  const signed = await api<SignedUpload>("/uploads/sign", { method: "POST", body: { kind } });
  const { error } = await (await loadSupabase())
    .storage.from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, blob, { contentType: "image/webp" });
  if (error) throw new Error("A imagem não subiu. Tenta de novo?");
  return signed.path;
}
