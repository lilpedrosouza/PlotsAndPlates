"use client";

import type { CoupleState, Invite } from "@pap/shared";
import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { useAuth } from "../auth";
import { platesKeys } from "../plates/keys";
import { plotsKeys } from "../plots/keys";

export const coupleKey = ["couple"] as const;

/** Par atual e convites enviados e recebidos. */
export function useCouple() {
  const auth = useAuth();
  return useQuery({
    queryKey: coupleKey,
    queryFn: () => api<CoupleState>("/couple"),
    enabled: auth.status === "in",
    staleTime: 60_000,
  });
}

/** Ter ou não ter par muda o caderno, o diário e as listas: recarrega tudo. */
function refreshEverything(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: coupleKey });
  void queryClient.invalidateQueries({ queryKey: platesKeys.all });
  void queryClient.invalidateQueries({ queryKey: plotsKeys.all });
  void queryClient.invalidateQueries({ queryKey: ["people"] });
}

export function useSendInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (username: string) => api<Invite>("/couple/invites", { method: "POST", body: { username } }),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: coupleKey }),
  });
}

type InviteAction = "accept" | "decline" | "cancel";

/** Aceitar, recusar ou cancelar um convite. */
export function useAnswerInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: InviteAction }) =>
      api<{ ok: true }>(`/couple/invites/${id}/${action}`, { method: "POST" }),
    onMutate: async ({ id, action }) => {
      if (action === "accept") return { previous: undefined };
      await queryClient.cancelQueries({ queryKey: coupleKey });
      const previous = queryClient.getQueryData<CoupleState>(coupleKey);
      if (previous) {
        queryClient.setQueryData<CoupleState>(coupleKey, {
          ...previous,
          incoming: previous.incoming.filter((invite) => invite.id !== id),
          outgoing: previous.outgoing.filter((invite) => invite.id !== id),
        });
      }
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(coupleKey, context.previous);
    },
    onSettled: (_data, _error, { action }) => {
      if (action === "accept") refreshEverything(queryClient);
      else void queryClient.invalidateQueries({ queryKey: coupleKey });
    },
  });
}

/** Desfaz o vínculo. Ninguém perde nada; cada um volta a ver só o seu. */
export function useUnlinkCouple() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>("/couple", { method: "DELETE" }),
    onSettled: () => refreshEverything(queryClient),
  });
}

/** Atalho: perfil do par (ou null), para ligar "juntos" por padrão. */
export function usePartner() {
  const couple = useCouple();
  return couple.data?.partner ?? null;
}
