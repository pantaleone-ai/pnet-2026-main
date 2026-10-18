import Link from "next/link";

const SELECTED = [
  {
    name: "AICEO",
    type: "Live product",
    problem: "Teams need answers from operating docs, not another chatbot.",
    distinctive: "RAG over runbooks with cited sources, deployed behind auth.",
    href: "/projects",
  },
  {
    name: "AI Capture Lab",
    type: "Live product",
    problem: "Document intake that requires consistent, reviewable output.",
    distinctive: "Pipeline with logged runs, retries, and human review points.",
    href: "/projects",
  },
  {
    name: "ProSwing",
    type: "Independent product",
    problem: "Coaching feedback that depends on manual video review.",
    distinctive: "Custom app with real interface, shipped and maintained.",
    href: "/apps",
  },
];

export default function SelectedWork() {
  return (
    <section
      aria-labelledby="selected-work-heading"
      className="relative mx-auto max-w-5xl px-6 py-12 md:py-16"
    >
      <div className="mx-auto max-w-2xl text-left">
        <h2
          id="selected-work-heading"
          className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          Selected work.
        </h2>
        <p className="mt-4 text-lg/8 text-foreground/80">
          Evidence over claims. Each of these is running software you can
          inspect — labeled by what it is, not inflated into a case study.
        </p>
      </div>
      <ul className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3">
        {SELECTED.map((project) => (
          <li key={project.name}>
            <Link
              href={project.href}
              className="group flex h-full flex-col rounded-lg border border-border p-6 text-left transition-colors hover:border-foreground/30"
            >
              <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                {project.type}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-foreground group-hover:underline group-hover:underline-offset-4">
                {project.name}
              </h3>
              <p className="mt-2 text-sm text-foreground/80">{project.problem}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {project.distinctive}
              </p>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mx-auto mt-6 max-w-2xl text-left text-sm text-muted-foreground">
        Full catalog with architecture notes and live links:{" "}
        <Link href="/projects" className="underline underline-offset-4">
          Explore projects
        </Link>{" "}
        ·{" "}
        <Link href="/apps" className="underline underline-offset-4">
          See all software
        </Link>
        .
      </p>
    </section>
  );
}
