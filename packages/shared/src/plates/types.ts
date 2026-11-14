import type { PersonRef } from "../couple/types";
import type { DishCategory, PriceLevel, RestaurantInput, WishlistPriority } from "./schemas";

/** De onde veio a busca ou o rascunho. */
export type PlaceSource = "google" | "osm";

/** Uma sugestão da busca de lugares. Nada disso é salvo, exceto os ids. */
export type PlaceSuggestion = {
  id: string;
  source: PlaceSource;
  primary: string;
  secondary: string;
  googlePlaceId?: string;
  osmRef?: string;
};

export type AutocompleteResponse = {
  source: PlaceSource;
  suggestions: PlaceSuggestion[];
};

/** Restaurante já cadastrado ou rascunho para o formulário. */
export type RestaurantDraft = {
  existingId?: string;
  source: "google+osm" | "osm" | "manual";
  fields: RestaurantInput;
  /** Há dados do OpenStreetMap no rascunho (exige atribuição). */
  osmAttribution: boolean;
};

/** Painel "Ver no Google": exibido ao vivo, nunca salvo. */
export type LivePlace = {
  phone?: string;
  website?: string;
  openingHours?: string[];
  photos: { url: string; attribution: string }[];
  mapsUrl: string;
};

export type Photo = {
  id: string;
  path: string;
  url: string;
  thumbUrl: string;
};

export type RestaurantRating = {
  food: number | null;
  service: number | null;
  ambiance: number | null;
  value: number | null;
  overall: number | null;
  review: string;
  isPrivate: boolean;
  updatedAt: string;
};

export type DishRating = {
  rating: number;
  comment: string;
  wouldOrderAgain: boolean | null;
  isPrivate: boolean;
  updatedAt: string;
};

export type Dish = {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  priceCents: number | null;
  category: DishCategory;
  photo: Photo | null;
  canEdit: boolean;
};

export type DishWithScore = Dish & {
  /** Média das notas que quem está vendo pode ver. */
  score: number | null;
  ratingCount: number;
  /** Fração (0–1) de "pediria de novo" entre quem respondeu. */
  wouldOrderAgainShare: number | null;
  myRating: DishRating | null;
  /** Nota do par neste prato (null sem par ou sem nota). */
  partnerRating: number | null;
};

export type Visit = {
  id: string;
  restaurantId: string;
  visitedOn: string;
  occasion: string;
  amountCents: number | null;
  together: boolean;
  photos: Photo[];
  dishIds: string[];
  /** Quem registrou (null quando foi quem está vendo). */
  registeredBy: PersonRef | null;
};

export type WishlistItem = {
  priority: WishlistPriority;
  reason: string;
  createdAt: string;
  /** Quem pôs no quero ir do casal (um ou os dois). */
  addedBy: PersonRef[];
};

export type RestaurantSummary = {
  id: string;
  name: string;
  neighborhood: string;
  city: string;
  cuisines: string[];
  priceLevel: PriceLevel | null;
  coverUrl: string | null;
  coverThumbUrl: string | null;
  lat: number | null;
  lng: number | null;
  myOverall: number | null;
  visitCount: number;
  lastVisitOn: string | null;
  wishlist: WishlistItem | null;
};

export type RestaurantDetail = RestaurantSummary & {
  address: string;
  phone: string;
  website: string;
  openingHours: string;
  description: string;
  googlePlaceId: string | null;
  osmRef: string | null;
  coverPath: string | null;
  canEdit: boolean;
  photos: Photo[];
  myRating: RestaurantRating | null;
  /** Avaliação do par (inclusive privada). */
  partnerRating: RestaurantRating | null;
  partner: PersonRef | null;
  dishes: DishWithScore[];
  visits: Visit[];
};

export type MapPin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: "fomos" | "quero-ir";
  myOverall: number | null;
};

export type Page<T> = {
  items: T[];
  nextCursor: string | null;
};
