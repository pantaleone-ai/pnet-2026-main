const STEPS = [
  {
    title: "Think",
    description: "Find the highest-value opportunity.",
  },
  {
    title: "Build",
    description: "Create the actual AI system.",
  },
  {
    title: "Improve",
    description: "Measure it and make it useful in the real business.",
  },
];

export default function DifferentiatorSection() {
  return (
    <section
      aria-labelledby="differentiator-heading"
      className="relative mx-auto max-w-5xl px-6 py-12 md:py-16"
    >
      <div className="mx-auto max-w-2xl text-left">
        <h2
          id="differentiator-heading"
          className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          We don&apos;t stop at strategy.
        </h2>
        <p className="mt-4 text-lg/8 text-foreground/80">
          We identify the opportunity, design the system, build it, and put it
          into operation.
        </p>
      </div>
      <div className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3">
        {STEPS.map((step) => (
          <div
            key={step.title}
            className="rounded-lg border border-border p-6 text-left"
          >
            <h3 className="text-lg font-semibold text-foreground">
              {step.title}
            </h3>
            <p className="mt-2 text-base text-foreground/80">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
