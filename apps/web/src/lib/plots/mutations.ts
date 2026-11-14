"use client";

import type {
  CustomList,
  CustomListDetail,
  ListInput,
  ListPatch,
  LogInput,
  LogPatch,
  TitleDetail,
  TitleKind,
  TitleRatingInput,
  TitleSummary,
  WatchLog,
} from "@pap/shared";
import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { plotsKeys } from "./keys";

/** Diário, quero ver, listas e Top 4 mudam quando algo de Plots muda. */
function refreshAll(queryClient: QueryClient, titleId?: string) {
  void queryClient.invalidateQueries({ queryKey: plotsKeys.diary() });
  void queryClient.invalidateQueries({ queryKey: plotsKeys.watchlists() });
  if (titleId) void queryClient.invalidateQueries({ queryKey: plotsKeys.title(titleId) });
}

/** Mudança otimista na página do título, com volta atrás se falhar e recarga ao fim. */
function optimisticTitle<Input>(queryClient: QueryClient, titleId: string, apply: (detail: TitleDetail, input: Input) => TitleDetail) {
  return {
    onMutate: async (input: Input) => {
      await queryClient.cancelQueries({ queryKey: plotsKeys.title(titleId) });
      const previous = queryClient.getQueryData<TitleDetail>(plotsKeys.title(titleId));
      if (previous) queryClient.setQueryData(plotsKeys.title(titleId), apply(previous, input));
      return { previous };
    },
    onError: (_error: unknown, _input: Input, context: { previous?: TitleDetail } | undefined) => {
      if (context?.previous) queryClient.setQueryData(plotsKeys.title(titleId), context.previous);
    },
    onSettled: () => refreshAll(queryClient, titleId),
  };
}

export function useAddLog(titleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LogInput) => api<WatchLog>(`/titles/${titleId}/logs`, { method: "POST", body: input }),
    onSettled: () => refreshAll(queryClient, titleId),
  });
}

export function useUpdateLog(titleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ logId, patch }: { logId: string; patch: LogPatch }) => api<WatchLog>(`/logs/${logId}`, { method: "PATCH", body: patch }),
    onSettled: () => refreshAll(queryClient, titleId),
  });
}

export function useDeleteLog(titleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (logId: string) => api<void>(`/logs/${logId}`, { method: "DELETE" }),
    ...optimisticTitle<string>(queryClient, titleId, (detail, logId) => ({ ...detail, logs: detail.logs.filter((log) => log.id !== logId) })),
  });
}

/** Nota da série inteira (ou do filme), dada direto. */
export function useRateTitle(titleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TitleRatingInput) => api(`/titles/${titleId}/rating`, { method: "PUT", body: input }),
    ...optimisticTitle<TitleRatingInput>(queryClient, titleId, (detail, input) => ({
      ...detail,
      myRating: {
        rating: input.rating !== undefined ? input.rating : (detail.myRating?.rating ?? null),
        liked: input.liked ?? detail.myRating?.liked ?? false,
        isPrivate: input.isPrivate ?? false,
      },
    })),
  });
}

export function useRateSeason(titleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ seasonNumber, rating }: { seasonNumber: number; rating: number | null }) =>
      rating === null
        ? api(`/titles/${titleId}/seasons/${seasonNumber}/rating`, { method: "DELETE" })
        : api(`/titles/${titleId}/seasons/${seasonNumber}/rating`, { method: "PUT", body: { rating } }),
    ...optimisticTitle<{ seasonNumber: number; rating: number | null }>(queryClient, titleId, (detail, { seasonNumber, rating }) => ({
      ...detail,
      seasons: detail.seasons.map((season) => (season.number === seasonNumber ? { ...season, myRating: rating } : season)),
    })),
  });
}

export function useSetWatchlist(titleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inWatchlist: boolean) =>
      inWatchlist ? api(`/titles/${titleId}/watchlist`, { method: "PUT", body: {} }) : api(`/titles/${titleId}/watchlist`, { method: "DELETE" }),
    ...optimisticTitle<boolean>(queryClient, titleId, (detail, inWatchlist) => ({ ...detail, inWatchlist })),
  });
}

/** "Assistimos!": registra e tira do quero ver. */
export function useAssistimos(titleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LogInput) => api<{ log: WatchLog }>(`/titles/${titleId}/assistimos`, { method: "POST", body: input }),
    onSettled: () => refreshAll(queryClient, titleId),
  });
}

export function useSetFavorites() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (titleIds: string[]) => api<{ titles: TitleSummary[] }>("/me/favorites", { method: "PUT", body: { titleIds } }),
    onSuccess: ({ titles }) => queryClient.setQueryData(plotsKeys.favorites(), titles),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: [...plotsKeys.all, "title"] }),
  });
}

export function useSetKind(titleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (kind: TitleKind) => api<TitleSummary>(`/titles/${titleId}/kind`, { method: "PATCH", body: { kind } }),
    ...optimisticTitle<TitleKind>(queryClient, titleId, (detail, kind) => ({ ...detail, kind })),
  });
}

const refreshLists = (queryClient: QueryClient, listId?: string) => {
  void queryClient.invalidateQueries({ queryKey: plotsKeys.lists() });
  if (listId) void queryClient.invalidateQueries({ queryKey: plotsKeys.list(listId) });
  void queryClient.invalidateQueries({ queryKey: [...plotsKeys.all, "title"] });
};

export function useCreateList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ListInput) => api<CustomList>("/lists", { method: "POST", body: input }),
    onSettled: () => refreshLists(queryClient),
  });
}

export function useUpdateList(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: ListPatch) => api<CustomListDetail>(`/lists/${listId}`, { method: "PATCH", body: patch }),
    onSuccess: (detail) => queryClient.setQueryData(plotsKeys.list(listId), detail),
    onSettled: () => refreshLists(queryClient, listId),
  });
}

export function useDeleteList(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>(`/lists/${listId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.removeQueries({ queryKey: plotsKeys.list(listId) }),
    onSettled: () => refreshLists(queryClient),
  });
}

export function useAddListItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, titleId }: { listId: string; titleId: string }) =>
      api(`/lists/${listId}/items`, { method: "POST", body: { titleId } }),
    onSettled: (_data, _error, { listId }) => refreshLists(queryClient, listId),
  });
}

export function useRemoveListItem(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => api<void>(`/lists/${listId}/items/${itemId}`, { method: "DELETE" }),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: plotsKeys.list(listId) });
      const previous = queryClient.getQueryData<CustomListDetail>(plotsKeys.list(listId));
      if (previous) {
        queryClient.setQueryData<CustomListDetail>(plotsKeys.list(listId), {
          ...previous,
          items: previous.items.filter((item) => item.id !== itemId),
          itemCount: previous.itemCount - 1,
        });
      }
      return { previous };
    },
    onError: (_error, _itemId, context) => {
      if (context?.previous) queryClient.setQueryData(plotsKeys.list(listId), context.previous);
    },
    onSettled: () => refreshLists(queryClient, listId),
  });
}

/** Nova ordem dos itens: a lista muda na hora e sincroniza depois. */
export function useReorderList(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemIds: string[]) => api<CustomListDetail>(`/lists/${listId}/order`, { method: "PUT", body: { itemIds } }),
    onMutate: async (itemIds) => {
      await queryClient.cancelQueries({ queryKey: plotsKeys.list(listId) });
      const previous = queryClient.getQueryData<CustomListDetail>(plotsKeys.list(listId));
      if (previous) {
        const byId = new Map(previous.items.map((item) => [item.id, item]));
        queryClient.setQueryData<CustomListDetail>(plotsKeys.list(listId), {
          ...previous,
          items: itemIds.map((id) => byId.get(id)).filter((item) => item !== undefined),
        });
      }
      return { previous };
    },
    onError: (_error, _ids, context) => {
      if (context?.previous) queryClient.setQueryData(plotsKeys.list(listId), context.previous);
    },
    onSettled: () => refreshLists(queryClient, listId),
  });
}
