import { z } from "zod";

/** PATCH /api/chatbots/[id]: editable identity + behavior. */
export const updateChatbotSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  welcomeMessage: z.string().trim().max(500).nullable().optional(),
  leadCaptureMode: z.enum(["off", "contact", "always"]).optional(),
  appearance: z
    .object({
      theme: z.enum(["auto", "light", "dark"]).optional(),
      launcherPosition: z.enum(["left", "right"]).optional(),
    })
    .optional(),
  /** draft | published. No other transitions exist yet (archived is P6). */
  status: z.enum(["draft", "published"]).optional(),
});

export type UpdateChatbotInput = z.infer<typeof updateChatbotSchema>;

/** PUT /api/chatbots/[id]/settings: retrieval + generation knobs. */
export const updateSettingsSchema = z.object({
  tone: z.string().trim().max(300).nullable().optional(),
  systemInstructions: z.string().trim().max(2000).nullable().optional(),
  suggestedQuestions: z.array(z.string().trim().min(1).max(200)).max(6).optional(),
  fallbackMessage: z.string().trim().min(1).max(500).optional(),
  topK: z.number().int().min(1).max(20).optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
