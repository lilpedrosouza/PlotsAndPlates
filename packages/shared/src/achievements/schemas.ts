import { z } from "zod";
import { ACHIEVEMENT_KEYS } from "./catalog";

export const markSeenSchema = z.object({ keys: z.array(z.enum(ACHIEVEMENT_KEYS)).min(1).max(ACHIEVEMENT_KEYS.length) });
export type MarkSeenInput = z.infer<typeof markSeenSchema>;
