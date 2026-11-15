/**
 * Constantes e tipos de perfil, sem zod: podem entrar no JavaScript da primeira
 * carga do site (cores, streamings, tipos de resposta) sem trazer os schemas.
 */

/**
 * Cores de destaque disponíveis. Cada tema define o próprio tom de cada uma;
 * "padrao" segue a cor do tema (terracota em Plates, amarelo-legenda em Plots).
 */
export const ACCENTS = [
  { key: "padrao", label: "Padrão do tema" },
  { key: "terracota", label: "Terracota" },
  { key: "oliva", label: "Oliva" },
  { key: "mostarda", label: "Mostarda" },
  { key: "vinho", label: "Vinho" },
  { key: "petroleo", label: "Petróleo" },
  { key: "ameixa", label: "Ameixa" },
] as const;

export const ACCENT_KEYS = ACCENTS.map((accent) => accent.key) as [AccentKey, ...AccentKey[]];
export type AccentKey = (typeof ACCENTS)[number]["key"];
export const DEFAULT_ACCENT: AccentKey = "padrao";

/**
 * Streamings que o usuário pode marcar como assinados (região BR).
 * `tmdbProviderId` é o id do provedor em /watch/providers do TMDB.
 */
export const STREAMINGS = [
  { key: "netflix", name: "Netflix", tmdbProviderId: 8 },
  { key: "prime-video", name: "Prime Video", tmdbProviderId: 119 },
  { key: "disney-plus", name: "Disney+", tmdbProviderId: 337 },
  { key: "hbo-max", name: "HBO Max", tmdbProviderId: 1899 },
  { key: "globoplay", name: "Globoplay", tmdbProviderId: 307 },
  { key: "apple-tv", name: "Apple TV", tmdbProviderId: 350 },
  { key: "paramount-plus", name: "Paramount+", tmdbProviderId: 531 },
  { key: "crunchyroll", name: "Crunchyroll", tmdbProviderId: 283 },
  { key: "mubi", name: "MUBI", tmdbProviderId: 11 },
] as const;

export const STREAMING_KEYS = STREAMINGS.map((streaming) => streaming.key) as [StreamingKey, ...StreamingKey[]];
export type StreamingKey = (typeof STREAMINGS)[number]["key"];

/** Nomes que não podem virar @username porque colidem com rotas do app. */
export const RESERVED_USERNAMES = new Set([
  "admin",
  "api",
  "auth",
  "buscar",
  "cadastro",
  "conta",
  "entrar",
  "pap",
  "perfil",
  "plates",
  "plots",
  "sair",
  "suporte",
]);

export const USERNAME_PATTERN = /^[a-z][a-z0-9_.]{2,19}$/;

export const UPLOAD_KINDS = ["avatar", "banner", "restaurant", "visit", "dish"] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];
/** Tipos de foto de Plates: sobem com miniatura. */
export const PHOTO_UPLOAD_KINDS = ["restaurant", "visit", "dish"] as const satisfies readonly UploadKind[];
export type PhotoUploadKind = (typeof PHOTO_UPLOAD_KINDS)[number];
/** Imagens do perfil: sobem sem miniatura. */
export type ProfileUploadKind = Exclude<UploadKind, PhotoUploadKind>;

/** O que qualquer usuário autenticado pode ver de um perfil. */
export type PublicProfile = {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  accent: AccentKey;
  createdAt: string;
};

/** Perfil completo, só para o próprio dono. */
export type OwnProfile = PublicProfile & {
  streamings: StreamingKey[];
  avatarPath: string | null;
  bannerPath: string | null;
};

export type MeResponse = {
  user: { id: string; email: string | null };
  /** `null` até a pessoa concluir o primeiro acesso. */
  profile: OwnProfile | null;
};

export type SignedUpload = {
  path: string;
  token: string;
  bucket: string;
  /** Só nas fotos de Plates: onde subir a miniatura. */
  thumbPath?: string;
  thumbToken?: string;
};

export type ApiError = {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
};
