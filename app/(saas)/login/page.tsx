"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TurnstileWidget, { type TurnstileRef } from "@/components/TurnstileWidget";
import { authClient } from "@/lib/auth-client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const website = searchParams.get("website")?.trim() || "";
  const justReset = searchParams.get("reset") === "true";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const turnstileRef = useRef<TurnstileRef>(null);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      let captchaHeaders: Record<string, string> | undefined;
      if (turnstileSiteKey) {
        try {
          const token = await turnstileRef.current?.execute();
          if (!token) throw new Error("Verification did not complete. Please try again.");
          captchaHeaders = { "x-captcha-response": token };
        } catch (err) {
          setError(err instanceof Error ? err.message : "Verification failed. Please try again.");
          return;
        }
      }
      const { error: signInError } = await authClient.signIn.email(
        {
          email: email.trim(),
          password,
          callbackURL: "/dashboard",
        },
        { headers: captchaHeaders },
      );
      if (signInError) {
        turnstileRef.current?.reset();
        setError(signInError.message || "Could not log you in.");
        return;
      }
      router.push("/dashboard");
    } catch (err) {
      turnstileRef.current?.reset();
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Log in to manage your assistant.
        </p>
        {justReset && (
          <p className="mt-2 text-sm text-muted-foreground" role="status">
            Password updated. Log in with your new password.
          </p>
        )}
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-password">Password</Label>
          <Input
            id="login-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <TurnstileWidget ref={turnstileRef} siteKey={turnstileSiteKey} action="auth" />
        <Button type="submit" disabled={pending || !email || !password}>
          {pending ? "Logging in…" : "Log in"}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        No account yet?{" "}
        <Link
          href={website ? `/signup?website=${encodeURIComponent(website)}` : "/signup"}
          className="underline underline-offset-4"
        >
          Create one
        </Link>
      </p>
      <p className="text-sm text-muted-foreground">
        Forgot your password?{" "}
        <Link href="/forgot-password" className="underline underline-offset-4">
          Reset it
        </Link>
      </p>
    </div>
  );
}
