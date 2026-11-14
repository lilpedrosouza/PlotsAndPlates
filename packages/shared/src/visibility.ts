/**
 * Regra de visibilidade das avaliações, espelhada nas policies de RLS do banco:
 *
 * - o dono sempre vê e edita o que é seu;
 * - uma avaliação privada é vista só pelo dono e pelo par dele;
 * - uma avaliação pública é vista por qualquer usuário autenticado;
 * - ninguém além do dono edita ou apaga.
 */

export type Viewer = {
  id: string;
  /** Id do par, quando o vínculo de casal está aceito. */
  partnerId?: string | null;
};

export type OwnedContent = {
  ownerId: string;
  isPrivate: boolean;
};

export function isOwner(viewer: Viewer | null, content: Pick<OwnedContent, "ownerId">): boolean {
  return viewer !== null && viewer.id === content.ownerId;
}

export function isPartnerOf(viewer: Viewer | null, userId: string): boolean {
  return viewer !== null && viewer.partnerId != null && viewer.partnerId === userId;
}

export function canView(viewer: Viewer | null, content: OwnedContent): boolean {
  if (viewer === null) return false;
  if (isOwner(viewer, content)) return true;
  if (content.isPrivate) return isPartnerOf(viewer, content.ownerId);
  return true;
}

export function canEdit(viewer: Viewer | null, content: Pick<OwnedContent, "ownerId">): boolean {
  return isOwner(viewer, content);
}

/**
 * Entra na média da comunidade ("O que o pessoal do PAP achou") só o que é
 * público e não pertence a quem está vendo nem ao par — esses aparecem na
 * parte do casal.
 */
export function countsForCommunity(viewer: Viewer | null, content: OwnedContent): boolean {
  if (content.isPrivate) return false;
  if (isOwner(viewer, content)) return false;
  if (isPartnerOf(viewer, content.ownerId)) return false;
  return true;
}
