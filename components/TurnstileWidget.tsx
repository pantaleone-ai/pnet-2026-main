"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

/**
 * Cloudflare Turnstile (invisible) for signup/login bot protection.
 * No extra dependency: loads the official challenges script once and uses
 * the global `turnstile.render` / `turnstile.execute` API.
 *
 * Usage: keep a ref, call `ref.current?.execute()` on submit to mint a
 * single-use token, pass it as the `x-captcha-response` header. The
 * better-auth captcha plugin verifies it server-side and rejects missing,
 * invalid, or replayed tokens with a 400 before any account is touched.
 */

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          size?: "invisible" | "normal" | "compact";
          action?: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string | undefined;
      execute: (widgetId?: string) => void;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

export type TurnstileRef = {
  /** Mints a fresh token; resolves once the challenge completes. */
  execute: () => Promise<string>;
  /** Clears the current token (call after a failed submit). */
  reset: () => void;
};

type Props = {
  siteKey: string | undefined;
  action?: string;
  onExpired?: () => void;
};

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";
let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("turnstile script failed")), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener("error", () => reject(new Error("turnstile script failed")), { once: true });
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

const TurnstileWidget = forwardRef<TurnstileRef, Props>(function TurnstileWidget(
  { siteKey, action, onExpired },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);
  const pendingRef = useRef<{
    resolve: (token: string) => void;
    reject: (err: Error) => void;
  } | null>(null);

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    let widgetId: string | undefined;
    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          size: "invisible",
          ...(action ? { action } : null),
          callback: (token: string) => {
            const pending = pendingRef.current;
            pendingRef.current = null;
            pending?.resolve(token);
          },
          "expired-callback": () => {
            pendingRef.current = null;
            onExpired?.();
          },
          "error-callback": () => {
            const pending = pendingRef.current;
            pendingRef.current = null;
            pending?.reject(new Error("Turnstile challenge failed. Please try again."));
          },
        });
        widgetIdRef.current = widgetId;
      })
      .catch(() => {
        // Script failed (offline, blocked): leave the token empty so the
        // server rejects the attempt with a clear error instead of hanging.
      });
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.remove(widgetId);
        } catch {
          // Ignore teardown errors.
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  useImperativeHandle(ref, () => ({
    execute() {
      return new Promise<string>((resolve, reject) => {
        if (!siteKey || !window.turnstile) {
          reject(new Error("Verification is unavailable. Please try again."));
          return;
        }
        pendingRef.current = { resolve, reject };
        try {
          window.turnstile.execute(widgetIdRef.current);
        } catch {
          pendingRef.current = null;
          reject(new Error("Verification failed to start. Please try again."));
        }
      });
    },
    reset() {
      pendingRef.current = null;
      if (window.turnstile) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch {
          // Ignore teardown errors.
        }
      }
    },
  }));

  // No site key (e.g. local dev before the widget is created): render
  // nothing so signup still works; the server logs that verification
  // is unenforced for this environment.
  if (!siteKey) return null;
  return <div ref={containerRef} aria-hidden="true" />;
});

export default TurnstileWidget;
