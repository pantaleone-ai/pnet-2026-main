import Link from "next/link";

const WORK = [
  {
    title: "AgentDNA",
    description:
      "Agent registry, signed identity, and a policy gateway for running AI agents.",
    href: "https://agentdna.ai",
  },
  {
    title: "ProfitSignals",
    description:
      "Chat agent for crypto charts, market news, and sector heatmaps.",
    href: "https://www.profitsignals.xyz/",
  },
  {
    title: "ImgSquash",
    description:
      "Compress JPEG and PNG images in the browser. Bulk upload, no signup.",
    href: "https://imgsquash.com/",
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
          Selected work
        </h2>
      </div>
      <ul className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3">
        {WORK.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="group block h-full rounded-lg border border-border p-6 text-left transition-colors hover:border-foreground/30"
            >
              <h3 className="text-lg font-semibold text-foreground group-hover:underline group-hover:underline-offset-4">
                {item.title}
              </h3>
              <p className="mt-2 text-base text-foreground/80">
                {item.description}
              </p>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mx-auto mt-8 max-w-2xl text-left">
        <Link href="/projects" className="underline underline-offset-4">
          See what we build
        </Link>
      </p>
    </section>
  );
}
