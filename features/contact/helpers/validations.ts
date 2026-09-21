/**
 * Backwards-compatible re-export.
 * Canonical schema lives in `@/lib/validations/contact`.
 */
export {
  contactFormSchema,
  contactPayloadSchema,
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
  type ContactFormValues,
  type ContactFormInput,
  type ContactPayload,
  type InquiryType,
} from "@/lib/validations/contact";
