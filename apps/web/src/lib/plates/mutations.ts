"use client";

import {
  type AddPhotoInput,
  type CreateRestaurantInput,
  type Dish,
  type DishInput,
  type DishPatch,
  type DishRating,
  type DishRatingInput,
  type FomosInput,
  type Photo,
  type RestaurantDetail,
  type RestaurantPatch,
  type RestaurantRating,
  type RestaurantRatingInput,
  type Visit,
  type VisitInput,
  type VisitPatch,
  type WishlistInput,
  type WishlistItem,
  overallFromCriteria,
  rankDishes,
} from "@pap/shared";
import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { platesKeys } from "./keys";

/** Listas e mapa mudam quando algo do caderno muda. */
function refreshLists(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: platesKeys.lists() });
  void queryClient.invalidateQueries({ queryKey: platesKeys.map() });
}

/** Atualiza a página do restaurante no cache, se ela estiver carregada. */
function patchDetail(queryClient: QueryClient, id: string, update: (detail: RestaurantDetail) => RestaurantDetail) {
  queryClient.setQueryData<RestaurantDetail>(platesKeys.detail(id), (current) => (current ? update(current) : current));
}

/** Depois de salvar, busca a página de novo para casar com o servidor. */
function refreshDetail(queryClient: QueryClient, id: string) {
  void queryClient.invalidateQueries({ queryKey: platesKeys.detail(id) });
}

/** Mutação otimista sobre a página do restaurante, com volta atrás se falhar. */
function optimistic<Input>(queryClient: QueryClient, id: string, apply: (detail: RestaurantDetail, input: Input) => RestaurantDetail) {
  return {
    onMutate: async (input: Input) => {
      await queryClient.cancelQueries({ queryKey: platesKeys.detail(id) });
      const previous = queryClient.getQueryData<RestaurantDetail>(platesKeys.detail(id));
      if (previous) queryClient.setQueryData(platesKeys.detail(id), apply(previous, input));
      return { previous };
    },
    onError: (_error: unknown, _input: Input, context: { previous?: RestaurantDetail } | undefined) => {
      if (context?.previous) queryClient.setQueryData(platesKeys.detail(id), context.previous);
    },
  };
}

export function useCreateRestaurant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRestaurantInput) => api<{ id: string }>("/restaurants", { method: "POST", body: input }),
    onSuccess: () => refreshLists(queryClient),
  });
}

export function useUpdateRestaurant(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: RestaurantPatch) => api<RestaurantDetail>(`/restaurants/${id}`, { method: "PATCH", body: patch }),
    onSuccess: (detail) => {
      queryClient.setQueryData(platesKeys.detail(id), detail);
      refreshLists(queryClient);
    },
  });
}

export function useDeleteRestaurant(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>(`/restaurants/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: platesKeys.detail(id) });
      refreshLists(queryClient);
    },
  });
}

export function useAddRestaurantPhoto(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddPhotoInput) => api<Photo>(`/restaurants/${id}/photos`, { method: "POST", body: input }),
    onSuccess: (photo) => {
      patchDetail(queryClient, id, (detail) => ({ ...detail, photos: [...detail.photos, photo] }));
      refreshLists(queryClient);
    },
  });
}

export function useRemoveRestaurantPhoto(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photoId: string) => api<void>(`/restaurants/${id}/photos/${photoId}`, { method: "DELETE" }),
    ...optimistic<string>(queryClient, id, (detail, photoId) => ({
      ...detail,
      photos: detail.photos.filter((photo) => photo.id !== photoId),
    })),
    onSettled: () => refreshLists(queryClient),
  });
}

export function useAddVisit(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: VisitInput) => api<Visit>(`/restaurants/${restaurantId}/visits`, { method: "POST", body: input }),
    onSuccess: () => {
      refreshDetail(queryClient, restaurantId);
      refreshLists(queryClient);
    },
  });
}

export function useUpdateVisit(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ visitId, patch }: { visitId: string; patch: VisitPatch }) =>
      api<Visit>(`/visits/${visitId}`, { method: "PATCH", body: patch }),
    onSuccess: (visit) => {
      patchDetail(queryClient, restaurantId, (detail) => ({
        ...detail,
        visits: detail.visits.map((current) => (current.id === visit.id ? visit : current)),
      }));
      refreshLists(queryClient);
    },
  });
}

export function useDeleteVisit(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (visitId: string) => api<void>(`/visits/${visitId}`, { method: "DELETE" }),
    ...optimistic<string>(queryClient, restaurantId, (detail, visitId) => ({
      ...detail,
      visits: detail.visits.filter((visit) => visit.id !== visitId),
      visitCount: Math.max(0, detail.visitCount - 1),
    })),
    onSettled: () => {
      refreshDetail(queryClient, restaurantId);
      refreshLists(queryClient);
    },
  });
}

export function useAddDish(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DishInput) => api<Dish>(`/restaurants/${restaurantId}/dishes`, { method: "POST", body: input }),
    onSuccess: () => refreshDetail(queryClient, restaurantId),
  });
}

export function useUpdateDish(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dishId, patch }: { dishId: string; patch: DishPatch }) =>
      api<Dish>(`/dishes/${dishId}`, { method: "PATCH", body: patch }),
    onSuccess: () => refreshDetail(queryClient, restaurantId),
  });
}

export function useDeleteDish(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dishId: string) => api<void>(`/dishes/${dishId}`, { method: "DELETE" }),
    ...optimistic<string>(queryClient, restaurantId, (detail, dishId) => ({
      ...detail,
      dishes: detail.dishes.filter((dish) => dish.id !== dishId),
    })),
    onSettled: () => refreshDetail(queryClient, restaurantId),
  });
}

/** Nota do restaurante: o selo muda na hora; a nota geral segue a mesma regra do servidor. */
export function useRateRestaurant(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RestaurantRatingInput) =>
      api<RestaurantRating>(`/restaurants/${restaurantId}/rating`, { method: "PUT", body: input }),
    ...optimistic<RestaurantRatingInput>(queryClient, restaurantId, (detail, input) => {
      const overall = overallFromCriteria(input);
      return {
        ...detail,
        myOverall: overall,
        myRating: {
          food: input.food ?? null,
          service: input.service ?? null,
          ambiance: input.ambiance ?? null,
          value: input.value ?? null,
          overall,
          review: input.review ?? "",
          isPrivate: input.isPrivate ?? false,
          updatedAt: new Date().toISOString(),
        },
      };
    }),
    onSuccess: (rating) => patchDetail(queryClient, restaurantId, (detail) => ({ ...detail, myRating: rating, myOverall: rating.overall })),
    onSettled: () => refreshLists(queryClient),
  });
}

export function useDeleteRestaurantRating(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>(`/restaurants/${restaurantId}/rating`, { method: "DELETE" }),
    ...optimistic<void>(queryClient, restaurantId, (detail) => ({ ...detail, myRating: null, myOverall: null })),
    onSettled: () => refreshLists(queryClient),
  });
}

/** Nota do prato: o ranking se reordena na hora. */
export function useRateDish(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dishId, input }: { dishId: string; input: DishRatingInput }) =>
      api<DishRating>(`/dishes/${dishId}/rating`, { method: "PUT", body: input }),
    ...optimistic<{ dishId: string; input: DishRatingInput }>(queryClient, restaurantId, (detail, { dishId, input }) => ({
      ...detail,
      dishes: rankDishes(
        detail.dishes.map((dish) =>
          dish.id === dishId
            ? {
                ...dish,
                score: input.rating,
                ratingCount: 1,
                wouldOrderAgainShare: input.wouldOrderAgain == null ? null : input.wouldOrderAgain ? 1 : 0,
                myRating: {
                  rating: input.rating,
                  comment: input.comment ?? "",
                  wouldOrderAgain: input.wouldOrderAgain ?? null,
                  isPrivate: input.isPrivate ?? false,
                  updatedAt: new Date().toISOString(),
                },
              }
            : dish,
        ),
      ),
    })),
    onSettled: () => refreshDetail(queryClient, restaurantId),
  });
}

export function useSetWishlist(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WishlistInput) =>
      api<WishlistItem>(`/restaurants/${restaurantId}/wishlist`, { method: "PUT", body: input }),
    onSuccess: (wishlist) => {
      patchDetail(queryClient, restaurantId, (detail) => ({ ...detail, wishlist }));
      refreshLists(queryClient);
    },
  });
}

export function useRemoveWishlist(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>(`/restaurants/${restaurantId}/wishlist`, { method: "DELETE" }),
    ...optimistic<void>(queryClient, restaurantId, (detail) => ({ ...detail, wishlist: null })),
    onSettled: () => refreshLists(queryClient),
  });
}

/** "Fomos!": sai do "quero ir" na hora e vira visita. */
export function useFomos(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FomosInput = {}) =>
      api<{ visit: Visit }>(`/restaurants/${restaurantId}/fomos`, { method: "POST", body: input }),
    ...optimistic<FomosInput | undefined>(queryClient, restaurantId, (detail) => ({ ...detail, wishlist: null })),
    onSuccess: ({ visit }) =>
      patchDetail(queryClient, restaurantId, (detail) => ({
        ...detail,
        visits: [visit, ...detail.visits],
        visitCount: detail.visitCount + 1,
        lastVisitOn: visit.visitedOn,
      })),
    onSettled: () => refreshLists(queryClient),
  });
}
