import Link from "next/link";

const PRINCIPLES = [
  {
    title: "Measured before and after",
    description:
      "One baseline before the build — handling time, hours on manual entry, or runs per week — compared after handoff.",
    href: "/b2b",
    linkLabel: "How we measure",
  },
  {
    title: "Observable runs",
    description:
      "Every automated run writes a log you can read without us. Retries, error handling, and a kill switch ship by default.",
    href: "/services",
    linkLabel: "What ships with a build",
  },
  {
    title: "Works with your stack",
    description:
      "N8N or LangChain wired to the CRM, helpdesk, and warehouse you already pay for. No rip-and-replace.",
    href: "/blog",
    linkLabel: "Technical notes",
  },
  {
    title: "You keep the system",
    description:
      "Repo, workflow JSON, credentials map, and runbook. Two working sessions where your team runs it while we watch.",
    href: "/about",
    linkLabel: "How we work",
  },
];

export default function PrinciplesSection() {
  return (
    <section
      aria-labelledby="principles-heading"
      className="relative mx-auto max-w-5xl px-6 py-12 md:py-16"
    >
      <div className="mx-auto max-w-2xl text-left">
        <h2
          id="principles-heading"
          className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          Why teams trust the handoff.
        </h2>
        <p className="mt-4 text-lg/8 text-foreground/80">
          No black boxes. The implementation approach is the guarantee.
        </p>
      </div>
      <ul className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2">
        {PRINCIPLES.map((principle) => (
          <li
            key={principle.title}
            className="rounded-lg border border-border p-6 text-left"
          >
            <h3 className="text-lg font-semibold text-foreground">
              {principle.title}
            </h3>
            <p className="mt-2 text-base text-foreground/80">
              {principle.description}
            </p>
            <p className="mt-3 text-sm">
              <Link
                href={principle.href}
                className="underline underline-offset-4 text-muted-foreground"
              >
                {principle.linkLabel}
              </Link>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
