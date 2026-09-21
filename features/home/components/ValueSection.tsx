const VALUES = [
  {
    title: "Time",
    description: "Reduce hours spent on repetitive work.",
  },
  {
    title: "Cost",
    description: "Reduce expensive manual operating effort.",
  },
  {
    title: "Capacity",
    description: "Give teams room for higher-value work.",
  },
  {
    title: "Quality",
    description: "Make important processes consistent and measurable.",
  },
];

export default function ValueSection() {
  return (
    <section
      aria-labelledby="value-heading"
      className="relative mx-auto max-w-5xl px-6 py-12 md:py-16"
    >
      <div className="mx-auto max-w-2xl text-left">
        <h2
          id="value-heading"
          className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          Start with business value.
        </h2>
        <p className="mt-4 text-lg/8 text-foreground/80">
          Every AI system should have a reason to exist. We focus on measurable
          improvements in time, cost, capacity, and quality.
        </p>
      </div>
      <dl className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {VALUES.map((value) => (
          <div
            key={value.title}
            className="rounded-lg border border-border p-6 text-left"
          >
            <dt className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {value.title}
            </dt>
            <dd className="mt-2 text-base text-foreground">
              {value.description}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mx-auto mt-8 max-w-2xl text-left text-sm text-muted-foreground">
        Every system is measured on time, cost, capacity, and quality.
      </p>
    </section>
  );
}
