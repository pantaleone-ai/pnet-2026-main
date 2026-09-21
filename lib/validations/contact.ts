import { z } from "zod";

/**
 * Invisible spam-security engine tuning constants.
 * Kept in one place so client + server stay in sync.
 */
export const HONEYPOT_FIELD = "b_company_website_ref" as const;

/** Minimum human dwell time on the form before submit (ms). Below = suspected bot. */
export const MIN_SUBMIT_MS = 2200;

/** Message cap surfaced in the UI character counter. */
export const MAX_MESSAGE_LENGTH = 2000;

/** Edge rate-limit stub: max submissions per window per IP. */
export const RATE_LIMIT_MAX = 5;
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export const INQUIRY_TYPES = [
  "AI Engineering",
  "Workflow Automation",
  "Architecture Advisory",
  "Other",
] as const;

export type InquiryType = (typeof INQUIRY_TYPES)[number];

/**
 * Permissive RFC-style email check.
 * Intentionally tolerant so valid humans are never blocked:
 * - local part allows dots, tags (+label), and standard specials
 * - domain allows subdomains (mail.example.co.uk)
 * - TLD allows modern short + long TLDs (.ai, .io, .tech, .net, .museum)
 */
const EMAIL_RE =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export function isPermissiveEmail(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;
  if (trimmed.includes(" ") || trimmed.includes("..")) return false;
  const parts = trimmed.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts as [string, string];
  if (!local || !domain || !domain.includes(".")) return false;
  const tld = domain.split(".").pop() ?? "";
  if (tld.length < 2 || tld.length > 63) return false;
  return EMAIL_RE.test(trimmed);
}

/** Collapse runs of whitespace to a single space and trim ends. */
export function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Strip ASCII control characters except tab/newline/carriage-return. */
export function stripControlChars(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

/** Tolerant cleanup applied before Zod length checks. Never throws. */
export function cleanInput(value: unknown): string {
  if (typeof value !== "string") return "";
  return stripControlChars(value).trim();
}

const tolerantString = (max: number) =>
  z
    .string()
    .transform((v) => cleanInput(v))
    .pipe(z.string().max(max));

const nameSchema = z
  .string()
  .transform((v) => normalizeText(stripControlChars(v)))
  .pipe(
    z
      .string()
      .min(2, { message: "Please enter your full name." })
      .max(100, { message: "Name must be at most 100 characters." }),
  );

const emailSchema = z
  .string()
  .transform((v) => cleanInput(v).toLowerCase())
  .pipe(
    z
      .string()
      .min(3, { message: "Please enter your email address." })
      .max(254, { message: "Email address is too long." })
      .refine(isPermissiveEmail, {
        message: "Please enter a valid email address.",
      }),
  );

const messageSchema = z
  .string()
  .transform((v) => (typeof v === "string" ? stripControlChars(v).trim() : ""))
  .pipe(
    z
      .string()
      .min(10, { message: "Message must be at least 10 characters." })
      .max(MAX_MESSAGE_LENGTH, {
        message: `Message must be at most ${MAX_MESSAGE_LENGTH} characters.`,
      }),
  );

const inquiryTypeSchema = z
  .enum(INQUIRY_TYPES, {
    message: "Please choose an inquiry type.",
  })
  // Tolerant default so older clients that omit the field are never blocked.
  .optional()
  .default("Other");

/** Honeypot: must stay empty. Any content = bot (handled server-side). */
const honeypotSchema = tolerantString(500).optional().default("");

/** Client mount timestamp (ms since epoch). Optional for backwards compat. */
const mountedAtSchema = z.coerce.number().int().nonnegative().optional();

/**
 * Client-side schema: validates what a human types.
 * Honeypot + timestamp ride along so the server can run its checks.
 */
export const contactFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  inquiryType: inquiryTypeSchema,
  message: messageSchema,
  [HONEYPOT_FIELD]: honeypotSchema,
  mountedAt: mountedAtSchema,
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

/** Raw form input before Zod transforms/defaults (use as useForm input generic). */
export type ContactFormInput = z.input<typeof contactFormSchema>;

/**
 * Server-side schema: same shape, explicit for API boundary clarity.
 */
export const contactPayloadSchema = contactFormSchema;

export type ContactPayload = z.infer<typeof contactPayloadSchema>;

/** True when the submit happened faster than any human plausibly could. */
export function isSuspiciousTiming(mountedAt: unknown): boolean {
  if (typeof mountedAt !== "number" || !Number.isFinite(mountedAt))
    return false;
  return Date.now() - mountedAt < MIN_SUBMIT_MS;
}

/** True when the honeypot carries any non-whitespace content. */
export function isHoneypotFilled(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export const contactValidation = {
  HONEYPOT_FIELD,
  MIN_SUBMIT_MS,
  MAX_MESSAGE_LENGTH,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  INQUIRY_TYPES,
  isPermissiveEmail,
  isSuspiciousTiming,
  isHoneypotFilled,
  normalizeText,
  cleanInput,
};
