import { z } from "zod";

/**
 * Environment variables schema validation
 * Validates required and optional environment variables at runtime
 */
const envSchema = z.object({
  // Required for email functionality
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),

  // Admin recipient(s) for contact + newsletter notifications. Single address
  // or comma-separated list (e.g. "you@gmail.com, contact@yourdomain.com").
  // Must be deliverable: the domain needs MX records or mail will bounce
  // after Resend accepts it.
  CONTACT_EMAIL: z
    .string()
    .min(1)
    .refine(
      (v) => {
        const list = v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        return (
          list.length > 0 &&
          list.every((s) => z.string().email().safeParse(s).success)
        );
      },
      { message: "CONTACT_EMAIL must be an email or comma-separated emails" },
    )
    .optional(),

  // Optional analytics (PostHog)
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  NEXT_PUBLIC_POSTHOG_UI_HOST: z.string().url().optional(),

  // Optional analytics (Google Analytics 4 + Meta Pixel, client IDs)
  NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: z
    .string()
    .regex(/^G-[A-Z0-9]+$/, "Must be a GA4 measurement ID (G-XXXXXXXXXX)")
    .optional(),
  NEXT_PUBLIC_META_PIXEL_ID: z.string().regex(/^\d+$/, "Must be numeric").optional(),

  // Optional server-side analytics (Measurement Protocol + Meta CAPI).
  // Supports both GA_API_SECRET and GOOGLE_ANALYTICS_API_SECRET aliases.
  GA_API_SECRET: z.string().optional(),
  GOOGLE_ANALYTICS_API_SECRET: z.string().optional(),
  // Meta Conversions API token (server-only — never NEXT_PUBLIC_).
  // Mint from the CAPI System User in Events Manager. Legacy
  // META_ACCESS_TOKEN is accepted as a fallback alias.
  META_CAPI_ACCESS_TOKEN: z.string().optional(),
  META_ACCESS_TOKEN: z.string().optional(),
  // Optional CAPI test event code (Meta Test Events tab). Never set in
  // production — it keeps events out of delivery/optimization.
  META_TEST_EVENT_CODE: z.string().optional(),

  // Optional base URL (auto-detected if not provided)
  NEXT_PUBLIC_BASE_URL: z.string().url().optional(),

  // Node environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

/**
 * Validated environment variables
 * This will throw an error at startup if required variables are missing
 */
export function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map(
        (err) => `${err.path.join(".")}: ${err.message}`,
      );
      throw new Error(
        `❌ Invalid environment variables:\n${missingVars.join("\n")}\n\nPlease check your .env.local file.`,
      );
    }
    throw error;
  }
}

// Type-safe environment variables
export type Env = z.infer<typeof envSchema>;
