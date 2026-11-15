import { z } from "zod";
import { ACCENT_KEYS, RESERVED_USERNAMES, STREAMING_KEYS, UPLOAD_KINDS, USERNAME_PATTERN } from "./profile-constants";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(USERNAME_PATTERN, "Use de 3 a 20 caracteres: letras minúsculas, números, ponto ou underline, começando por letra.")
  .refine((value) => !RESERVED_USERNAMES.has(value), "Esse nome é reservado. Escolha outro.");

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Diga como quer ser chamado.")
  .max(50, "O nome pode ter no máximo 50 caracteres.");

export const bioSchema = z.string().trim().max(280, "A bio pode ter no máximo 280 caracteres.");

export const accentSchema = z.enum(ACCENT_KEYS);

export const streamingsSchema = z
  .array(z.enum(STREAMING_KEYS))
  .max(STREAMING_KEYS.length)
  .transform((keys) => [...new Set(keys)]);

/** Caminho de um arquivo no bucket de mídia, sempre gerado pela API. */
export const mediaPathSchema = z
  .string()
  .max(200)
  .regex(/^[a-z0-9][a-z0-9/_-]*\.webp$/, "Caminho de imagem inválido.");

/** Primeiro acesso: escolha do @username e do nome de exibição. */
export const createProfileSchema = z.object({
  username: usernameSchema,
  displayName: displayNameSchema,
});
export type CreateProfileInput = z.infer<typeof createProfileSchema>;

export const updateProfileSchema = z
  .object({
    username: usernameSchema,
    displayName: displayNameSchema,
    bio: bioSchema,
    accent: accentSchema,
    streamings: streamingsSchema,
    avatarPath: mediaPathSchema.nullable(),
    bannerPath: mediaPathSchema.nullable(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Nada para atualizar.");
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const signUploadSchema = z.object({
  kind: z.enum(UPLOAD_KINDS),
});
export type SignUploadInput = z.infer<typeof signUploadSchema>;

export const searchProfilesSchema = z.object({
  q: z.string().trim().min(2, "Digite pelo menos 2 caracteres.").max(50),
});
