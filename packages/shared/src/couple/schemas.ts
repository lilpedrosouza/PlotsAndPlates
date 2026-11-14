import { z } from "zod";
import { usernameSchema } from "../profile";

/** Convite de par pelo @username (com ou sem a arroba). */
export const inviteInputSchema = z.object({
  username: z.preprocess((value) => (typeof value === "string" ? value.trim().replace(/^@/, "").toLowerCase() : value), usernameSchema),
});
export type InviteInput = z.input<typeof inviteInputSchema>;

export const communityQuerySchema = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(30).default(10),
});
