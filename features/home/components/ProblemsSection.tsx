import Link from "next/link";

const PROBLEMS = [
  {
    title: "Repetitive data entry across systems",
    href: "/services",
    anchor: "Copy-paste between CRM, helpdesk, and spreadsheets.",
  },
  {
    title: "Manual research and qualification",
    href: "/services",
    anchor: "Enrichment and triage that eats hours weekly.",
  },
  {
    title: "Reporting and document processing",
    href: "/b2b",
    anchor: "Intake-to-filed paths with clear inputs and outputs.",
  },
  {
    title: "Support intake and follow-up",
    href: "/b2b",
    anchor: "Triage, filing, and coverage without night shifts.",
  },
  {
    title: "Answers buried in internal docs",
    href: "/blog",
    anchor: "Retrieval over runbooks with cited sources.",
  },
  {
    title: "Processes that don't scale",
    href: "/projects",
    anchor: "See systems built for real operating needs.",
  },
];

export default function ProblemsSection() {
  return (
    <section
      aria-labelledby="problems-heading"
      className="relative mx-auto max-w-5xl px-6 py-12 md:py-16"
    >
      <div className="mx-auto max-w-2xl text-left">
        <h2
          id="problems-heading"
          className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          Problems worth solving.
        </h2>
        <p className="mt-4 text-lg/8 text-foreground/80">
          If your team repeats it every week, it is a candidate. We find the
          expensive steps and build around the systems you already use.
        </p>
      </div>
      <ul className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-3 sm:grid-cols-2">
        {PROBLEMS.map((problem) => (
          <li key={problem.title}>
            <Link
              href={problem.href}
              className="group block rounded-lg border border-border p-5 text-left transition-colors hover:border-foreground/30"
            >
              <h3 className="text-base font-semibold text-foreground group-hover:underline group-hover:underline-offset-4">
                {problem.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {problem.anchor}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
