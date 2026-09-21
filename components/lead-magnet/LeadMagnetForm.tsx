"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface LeadMagnetFormProps {
  guideTitle: string;
  downloadUrl: string;
}

export default function LeadMagnetForm({
  guideTitle,
  downloadUrl,
}: LeadMagnetFormProps) {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(
        "That address does not look valid. Check for a typo and try again.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/lead-magnet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, guide: guideTitle }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Delivery failed. Try again.");
      }
      setIsSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Delivery failed. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="text-center p-6 border border-primary/20 rounded-lg bg-primary/5">
        <h3 className="text-lg font-semibold mb-2">Thank you!</h3>
        <p className="text-muted-foreground mb-4">
          Your {guideTitle} is ready for download.
        </p>
        <Button asChild>
          <a href={downloadUrl} download>
            Download
          </a>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 border rounded-lg">
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Sending…" : `Send the ${guideTitle}`}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        One email with the PDF. Unsubscribe anytime.
      </p>
    </form>
  );
}
