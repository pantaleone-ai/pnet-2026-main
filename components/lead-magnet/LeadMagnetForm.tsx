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
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    // Store email in localStorage for now (would be sent to backend in production)
    const submissions = JSON.parse(
      localStorage.getItem("leadMagnetSubmissions") || "[]",
    );
    submissions.push({
      email,
      guide: guideTitle,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem("leadMagnetSubmissions", JSON.stringify(submissions));

    setIsSubmitted(true);
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
            Download Guide
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
      <Button type="submit" className="w-full">
        Get Free {guideTitle}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        We respect your privacy. Unsubscribe at any time.
      </p>
    </form>
  );
}