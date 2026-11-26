"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Website URL capture → signup handoff. The value travels as the
 * `website` query param (server-readable, bookmarkable) — never
 * localStorage-only — so signup and later onboarding can pick it up.
 */
export default function UrlCaptureForm({
  id,
  buttonLabel = "Get my assistant",
}: {
  id: string;
  buttonLabel?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function normalize(raw: string): string | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const withScheme =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`;
    try {
      const url = new URL(withScheme);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      if (!url.hostname.includes(".")) return null;
      return url.hostname + (url.pathname === "/" ? "" : url.pathname);
    } catch {
      return null;
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalize(value);
    if (!normalized) {
      setError("Enter your website address, e.g. acmebakery.com.");
      return;
    }
    setError(null);
    router.push(`/signup?website=${encodeURIComponent(normalized)}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-xl flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={id} className="sr-only">
          Your website address
        </label>
        <input
          id={id}
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder="yourbusiness.com"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground flex h-11 flex-1 rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <button
          type="submit"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center justify-center rounded-md px-6 text-sm font-medium transition-colors"
        >
          {buttonLabel}
        </button>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Free during early access. No credit card — your site becomes the demo.
      </p>
    </form>
  );
}
