import Link from "next/link";

const FACTS = [
  {
    title: "Enterprise engineering",
    description: "Years shipping production systems for large organizations.",
  },
  {
    title: "Systems in operation",
    description: "AI agents, automations, and apps running real work.",
  },
  {
    title: "Documented in public",
    description: "Build notes, projects, and tools you can inspect today.",
  },
];

export default function TrustStrip() {
  return (
    <section
      aria-labelledby="trust-heading"
      className="relative mx-auto max-w-5xl px-6 py-12 md:py-16"
    >
      <div className="mx-auto max-w-2xl text-left">
        <h2
          id="trust-heading"
          className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          How we earn trust.
        </h2>
        <p className="mt-4 text-lg/8 text-foreground/80">
          No borrowed logos. No invented numbers. We show the work.
        </p>
      </div>
      <div className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3">
        {FACTS.map((fact) => (
          <div
            key={fact.title}
            className="rounded-lg border border-border p-6 text-left"
          >
            <h3 className="text-lg font-semibold text-foreground">
              {fact.title}
            </h3>
            <p className="mt-2 text-base text-foreground/80">
              {fact.description}
            </p>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row">
        <Link
          href="/projects"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Browse projects
        </Link>
        <Link
          href="/about"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Background and experience
        </Link>
      </div>
    </section>
  );
}
