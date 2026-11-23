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
});

export type ChatPayload = z.infer<typeof chatPayloadSchema>;
