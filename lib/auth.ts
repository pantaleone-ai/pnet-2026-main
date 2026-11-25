import { betterAuth, type BetterAuthOptions } from "better-auth";
import { captcha } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { logger } from "./logger";

import {
  chatbots,
  organizationMembers,
  organizations,
} from "@/drizzle/schema";
import { getDb, type ChatDatabase } from "./db";
import { getResendClient } from "./resendClient";

type SendMailFn = (args: { user: { email: string }; url: string }) => Promise<void>;

const sendVerificationEmail: SendMailFn = async ({ user: u, url }) => {
  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: process.env.CONTACT_FROM_EMAIL || "Pantaleone <contact@pantaleone.net>",
    to: u.email,
    subject: "Verify your Pantaleone Chat account",
    html: `<p>Welcome to Pantaleone Chat.</p><p><a href="${url}">Verify your email address</a> to finish creating your account. This link expires soon.</p>`,
    text: `Welcome to Pantaleone Chat. Verify your email address: ${url}`,
  });
  if (error) {
    throw new Error(`Verification email failed: ${error.message}`);
  }
};

const sendResetPassword: SendMailFn = async ({ user: u, url }) => {
  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: process.env.CONTACT_FROM_EMAIL || "Pantaleone <contact@pantaleone.net>",
    to: u.email,
    subject: "Reset your Pantaleone Chat password",
    html: `<p><a href="${url}">Reset your password</a>. If you did not request this, ignore this email.</p>`,
    text: `Reset your password: ${url}`,
  });
  if (error) {
    throw new Error(`Password-reset email failed: ${error.message}`);
  }
};

export const AUTH_COOKIE_PREFIX = "pantaleone-chat";

function randomId(): string {
  return crypto.randomUUID();
}

function slugifyBase(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return slug || "workspace";
}

/**
 * better-auth instance factory. Auth needs the request-scoped D1 binding,
 * so instances are created per Cloudflare env (memoized — one per env
 * object, never global). Never import a singleton: local dev, preview,
 * and production each resolve different bindings.
 */
type AuthInstance = ReturnType<typeof createAuth>;

const instances = new WeakMap<object, AuthInstance>();

export type AuthEnv = {
  CHAT_DB?: unknown;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  TURNSTILE_SECRET_KEY?: string;
};

function createAuth(env: AuthEnv) {
  if (!env.CHAT_DB) {
    throw new Error(
      "CHAT_DB binding is missing. Configure the D1 database in wrangler.jsonc.",
    );
  }
  const db = getDb(env.CHAT_DB as never) as ChatDatabase;

  if (!env.TURNSTILE_SECRET_KEY) {
    logger.warn(
      "TURNSTILE_SECRET_KEY is not set — signup/login run without bot protection in this environment. Set it before public traffic.",
      { context: "auth" },
    );
  }

  const options = {
    secret: env.BETTER_AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL ?? process.env.BETTER_AUTH_URL,
    trustedOrigins: [
      "https://www.pantaleone.net",
      "https://chat.pantaleone.net",
    ],
    advanced: {
      // Cloudflare puts the real visitor IP in cf-connecting-ip; without
      // this, better-auth rate limiting falls back to one shared bucket.
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"] },
    },
    database: drizzleAdapter(db, { provider: "sqlite" }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword,
    },
    emailVerification: {
      sendVerificationEmail,
      sendOnSignUp: true,
    },
    // Turnstile bot protection on auth endpoints. Only active when the
    // secret is configured; otherwise signup/login still work but every
    // attempt is logged so a missing key is visible, never silent.
    ...(env.TURNSTILE_SECRET_KEY
      ? {
          plugins: [
            captcha({
              provider: "cloudflare-turnstile",
              secretKey: env.TURNSTILE_SECRET_KEY,
              endpoints: ["/sign-up/email", "/sign-in/email"],
            }),
          ],
        }
      : {}),
    databaseHooks: {
      user: {
        create: {
          async after(createdUser) {
            // One organization + one draft chatbot per new customer.
            // No roles UI yet: every initial member is an owner.
            const base = slugifyBase(
              createdUser.name || createdUser.email.split("@")[0] || "workspace",
            );
            const slug = `${base}-${randomId().slice(0, 6)}`;
            const orgId = randomId();
            await db.insert(organizations).values({
              id: orgId,
              name: `${createdUser.name || createdUser.email} Workspace`,
              slug,
            });
            await db.insert(organizationMembers).values({
              id: randomId(),
              organizationId: orgId,
              userId: createdUser.id,
              role: "owner",
            });
            await db.insert(chatbots).values({
              id: randomId(),
              organizationId: orgId,
              name: "My Assistant",
              publicId: randomId().replace(/-/g, ""),
              description: null,
              status: "draft",
            });
          },
        },
      },
    },
  } satisfies BetterAuthOptions;

  return betterAuth(options);
}

export function getAuth(env: AuthEnv): AuthInstance {
  const cached = instances.get(env as object);
  if (cached) return cached;
  const auth = createAuth(env);
  instances.set(env as object, auth);
  return auth;
}
