"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

/**
 * Post-signup notice + email-verification landing target.
 *
 * Two states, split by query params:
 * - No token (signup redirect): "check your inbox" + resend.
 * - token (email click): forward to the better-auth API endpoint, which
 *   verifies, sets the session cookie, and redirects back to
 *   ?verified=true. Full navigation (not fetch) so cookies + 302s work.
 */
export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email")?.trim() || "";
  const token = searchParams.get("token")?.trim() || "";
  const verified = searchParams.get("verified") === "true";
  const error = searchParams.get("error")?.trim() || "";
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const url =
      `/api/auth/verify-email?token=${encodeURIComponent(token)}` +
      `&callbackURL=${encodeURIComponent("/verify-email?verified=true")}`;
    window.location.href = url;
  }, [token]);

  if (token) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Verifying…</h1>
        <p className="text-sm text-muted-foreground">
          Confirming your email address. You will be redirected automatically.
        </p>
      </div>
    );
  }

  if (verified) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Email verified
        </h1>
        <p className="text-sm text-muted-foreground">
          Your account is ready. Continue to your dashboard to meet your
          assistant.
        </p>
        <Button asChild>
          <Link href="/dashboard">Continue to dashboard</Link>
        </Button>
      </div>
    );
  }

  async function resend() {
    if (!email || resending) return;
    setResending(true);
    setResendError(null);
    try {
      const { error: sendError } = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/dashboard",
      });
      if (sendError) {
        setResendError(sendError.message || "Could not resend the email.");
        return;
      }
      setResent(true);
    } catch (err) {
      setResendError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Check your email
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {email ? (
            <>
              We sent a verification link to{" "}
              <span className="font-medium text-foreground">{email}</span>.
              Click it to finish creating your account.
            </>
          ) : (
            "We sent you a verification link. Click it to finish creating your account."
          )}
        </p>
      </div>
      {(error || resendError) && (
        <p className="text-sm text-destructive" role="alert">
          {resendError ||
            (error === "invalid_token"
              ? "That link is invalid or expired. Request a new one below."
              : "Verification failed. Request a new link below.")}
        </p>
      )}
      {resent ? (
        <p className="text-sm text-muted-foreground">
          New link sent. Check your inbox (and spam folder).
        </p>
      ) : (
        email && (
          <Button onClick={resend} disabled={resending} variant="outline">
            {resending ? "Sending…" : "Resend verification email"}
          </Button>
        )
      )}
      <p className="text-sm text-muted-foreground">
        Wrong address?{" "}
        <Link href="/signup" className="underline underline-offset-4">
          Create a new account
        </Link>{" "}
        · Already verified?{" "}
        <Link href="/login" className="underline underline-offset-4">
          Log in
        </Link>
      </p>
    </div>
  );
}
