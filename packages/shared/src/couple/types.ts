import { coupleRating } from "../ratings";
import type { PublicProfile } from "../profile";

/** Uma pessoa, no mínimo para mostrar nome e foto. */
export type PersonRef = { id: string; username: string; displayName: string; avatarUrl: string | null };

export type Invite = { id: string; from: PersonRef; to: PersonRef; createdAt: string };

export type CoupleState = {
  partner: PublicProfile | null;
  since: string | null;
  outgoing: Invite[];
  incoming: Invite[];
};

/** Nota de você, do par e a média do casal (não arredondada). */
export type SideBySide = { mine: number | null; partner: number | null; couple: number | null };

export function sideBySide(mine: number | null | undefined, partner: number | null | undefined): SideBySide {
  const rating = coupleRating(mine, partner);
  return { mine: rating.mine, partner: rating.partner, couple: rating.average };
}

export type CommunityReview = {
  person: PersonRef;
  rating: number | null;
  review: string;
  date: string;
  /** Em Plots: "T2" quando a avaliação é de uma temporada. */
  seasonNumber?: number | null;
};

export type CommunityPage = {
  average: number | null;
  count: number;
  items: CommunityReview[];
  nextCursor: string | null;
};

export type PublicPlatesProfile = {
  profile: PublicProfile;
  stats: { restaurants: number; visits: number; averageRating: number | null };
  favorites: { id: string; name: string; coverThumbUrl: string | null; overall: number }[];
  recent: { restaurantId: string; restaurantName: string; overall: number | null; review: string; date: string }[];
  isPartner: boolean;
};

export type PublicPlotsProfile = {
  profile: PublicProfile;
  stats: { sessions: number; titles: number; averageRating: number | null };
  favorites: { id: string; title: string; posterPath: string | null; tmdbType: "movie" | "tv" }[];
  recent: { titleId: string; title: string; posterPath: string | null; seasonNumber: number | null; rating: number | null; review: string; date: string }[];
  isPartner: boolean;
};
