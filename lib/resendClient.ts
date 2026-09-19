// Resend API wrapper using environment variable RESEND_API_KEY
import { Resend, type CreateEmailOptions } from "resend";

let client: Resend | null = null;

export function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }
  if (!client) {
    client = new Resend(apiKey);
  }
  return client;
}

export const DEFAULT_FROM_EMAIL =
  process.env.CONTACT_FROM_EMAIL ||
  "Portfolio Contact <contact@pantaleone.net>";

/**
 * Parse admin recipient list from CONTACT_EMAIL.
 * Accepts a single address or comma-separated list so submissions can fan
 * out to a deliverable inbox (e.g. Gmail) while a domain mailbox is
 * being set up. Falls back when unset. Duplicates and blanks removed.
 */
export function parseRecipients(
  raw: string | undefined,
  fallback: string,
): string[] {
  const list = (raw?.trim() ? raw : fallback)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set(list)];
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let cachedAudienceId: string | null | undefined;

/**
 * Resolve the Resend audience ID. Accepts either RESEND_AUDIENCE_ID or
 * AUDIENCE_ID, as a UUID or an audience name (names are resolved via the
 * Resend API and cached). Returns undefined when unconfigured so callers
 * can skip the audience step but still send email.
 */
export async function getAudienceId(): Promise<string | undefined> {
  if (cachedAudienceId !== undefined) return cachedAudienceId ?? undefined;

  const raw = (
    process.env.RESEND_AUDIENCE_ID ||
    process.env.AUDIENCE_ID ||
    ""
  ).trim();
  if (!raw) {
    cachedAudienceId = null;
    return undefined;
  }
  if (UUID_RE.test(raw)) {
    cachedAudienceId = raw;
    return raw;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    cachedAudienceId = null;
    return undefined;
  }
  try {
    const response = await fetch("https://api.resend.com/audiences", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const body = (await response.json()) as {
      data?: Array<{ id: string; name: string }>;
    };
    const match = body.data?.find((a) => a.name === raw);
    cachedAudienceId = match?.id ?? null;
    return match?.id;
  } catch {
    cachedAudienceId = null;
    return undefined;
  }
}

export interface EmailParams {
  to: string | string[];
  from?: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string | string[];
}

export async function sendEmail(params: EmailParams) {
  const resend = getResendClient();
  const base = {
    from: params.from ?? DEFAULT_FROM_EMAIL,
    to: params.to,
    subject: params.subject,
    ...(params.replyTo ? { replyTo: params.replyTo } : {}),
  };
  let payload: CreateEmailOptions;
  if (params.html && params.text) {
    payload = { ...base, html: params.html, text: params.text };
  } else if (params.html) {
    payload = { ...base, html: params.html };
  } else if (params.text) {
    payload = { ...base, text: params.text };
  } else {
    throw new Error("sendEmail requires html or text content");
  }
  return await resend.emails.send(payload);
}
