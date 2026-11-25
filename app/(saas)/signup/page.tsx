"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TurnstileWidget, { type TurnstileRef } from "@/components/TurnstileWidget";
import { authClient } from "@/lib/auth-client";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
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
      // Mint a fresh single-use Turnstile token per attempt. When no site
      // key is configured (local dev), the server skips verification.
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
      const { error: signUpError } = await authClient.signUp.email(
        {
          name: name.trim() || email.trim(),
          email: email.trim(),
          password,
          callbackURL: "/dashboard",
        },
        { headers: captchaHeaders },
      );
      if (signUpError) {
        turnstileRef.current?.reset();
        setError(signUpError.message || "Could not create your account.");
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
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One workspace and one assistant are created automatically.
        </p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-name">Name</Label>
          <Input
            id="signup-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-password">Password</Label>
          <Input
            id="signup-password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <TurnstileWidget ref={turnstileRef} siteKey={turnstileSiteKey} />
        <Button type="submit" disabled={pending || !email || !password}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="underline underline-offset-4">
          Log in
        </Link>
      </p>
    </div>
  );
}
