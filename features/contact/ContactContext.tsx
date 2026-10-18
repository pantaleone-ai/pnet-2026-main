"use client";

import { useSearchParams } from "next/navigation";

const COPY: Record<string, string> = {
  book: "Working session: bring one workflow. We scope it or rule it out in 30 minutes.",
  assessment: "Workflow audit: two weeks on one process, ranked build list with time costs.",
  implementation: "Build engagement: top-ranked workflow against your APIs, logged and handed over.",
  enterprise: "Retainer: a queue of workflows worked down one system at a time.",
  b2b: "Team engagement: audit, build with your stack, and handoff with a runbook.",
};

export default function ContactContext() {
  const params = useSearchParams();
  const key = ["book", "assessment", "implementation", "enterprise", "b2b"].find(
    (k) => params.get(k) !== null,
  );
  if (!key) return null;
  return (
    <p
      role="status"
      className="mx-auto max-w-2xl px-4 pt-4 text-sm text-muted-foreground"
    >
      {COPY[key]}
    </p>
  );
}
