import { Button } from "@/components/ui/button";
import Link from "next/link";

const STEPS = [
  {
    index: "01",
    title: "Find",
    description: "Identify a high-value workflow worth improving.",
  },
  {
    index: "02",
    title: "Design",
    description: "Define the process, architecture, and success metrics.",
  },
  {
    index: "03",
    title: "Build",
    description: "Ship the AI system into the real operating environment.",
  },
  {
    index: "04",
    title: "Improve",
    description: "Measure time, cost, quality, and business impact.",
  },
];

export default function ProcessSection() {
  return (
    <section
      aria-labelledby="process-heading"
      className="relative mx-auto max-w-5xl px-6 py-12 md:py-16"
    >
      <div className="mx-auto max-w-2xl text-left">
        <h2
          id="process-heading"
          className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          From opportunity to working system.
        </h2>
        <p className="mt-4 text-lg/8 text-foreground/80">
          You always know what happens next. One workflow at a time, with a
          handoff you can run without us.
        </p>
      </div>
      <ol className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step) => (
          <li
            key={step.index}
            className="rounded-lg border border-border p-6 text-left"
          >
            <p className="font-mono text-sm text-muted-foreground">
              {step.index}
            </p>
            <h3 className="mt-2 text-lg font-semibold text-foreground">
              {step.title}
            </h3>
            <p className="mt-2 text-base text-foreground/80">
              {step.description}
            </p>
          </li>
        ))}
      </ol>
      <div className="mx-auto mt-8 max-w-2xl text-left">
        <Button asChild variant="outline">
          <Link href="/services">How engagements work</Link>
        </Button>
      </div>
    </section>
  );
}
