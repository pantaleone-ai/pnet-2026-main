import { z } from "zod";

export const CHAT_MAX_MESSAGE_LENGTH = 2000;
export const CHAT_MAX_HISTORY = 10;

const historyItemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(CHAT_MAX_MESSAGE_LENGTH),
});

export const chatPayloadSchema = z.object({
  message: z
    .string()
    .trim()
    .min(2, "Message must be at least 2 characters.")
    .max(CHAT_MAX_MESSAGE_LENGTH, "Message is too long."),
  history: z.array(historyItemSchema).max(CHAT_MAX_HISTORY).optional(),
  // How the message was composed: suggestion chip, typed composer, retry.
  // Used only for aggregate funnel analytics, never PII.
  via: z.enum(["suggestion", "typed", "retry"]).optional(),
  // Page the widget was opened on (route group only, e.g. /shop).
  // Powers per-page suggestion CTR. Normalized server-side.
  route: z
    .string()
    .regex(/^\/[a-z0-9/-]*$/, "Must be a same-site path")
    .max(64)
    .optional(),
});

export type ChatPayload = z.infer<typeof chatPayloadSchema>;
