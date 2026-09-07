"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface NewsletterSignupProps {
  title?: string;
  description?: string;
}

export default function NewsletterSignup({
  title = "Build notes, monthly",
  description = "One email a month: an N8N workflow, an LLM integration note, and what broke in production.",
}: NewsletterSignupProps) {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("That address does not look valid. Check for a typo and try again.");
      return;
    }

    // Store subscription in localStorage (would be sent to newsletter service in production)
    const subscriptions = JSON.parse(
      localStorage.getItem("newsletterSubscriptions") || "[]",
    );
    subscriptions.push({
      email,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem("newsletterSubscriptions", JSON.stringify(subscriptions));

    setIsSubscribed(true);
  };

  if (isSubscribed) {
    return (
      <div className="text-center p-6 border border-primary/20 rounded-lg bg-primary/5">
        <h3 className="text-lg font-semibold mb-2">Subscribed</h3>
        <p className="text-muted-foreground">
          Next issue goes to {email}. One email a month.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 border rounded-lg bg-muted/50">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4 text-sm">{description}</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="newsletter-email" className="sr-only">
            Email Address
          </Label>
          <Input
            id="newsletter-email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <Button type="submit" className="w-full" size="sm">
          Subscribe to build notes
        </Button>
      </form>
      <p className="text-xs text-muted-foreground text-center mt-2">
        One email a month. Unsubscribe anytime.
      </p>
    </div>
  );
}