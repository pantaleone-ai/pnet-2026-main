const USE_CASES = [
  "Lead qualification",
  "Research and analysis",
  "Reporting",
  "Data processing",
  "CRM workflows",
  "Customer support",
  "Document processing",
  "Cross-system workflows",
];

export default function UseCasesSection() {
  return (
    <section
      aria-labelledby="use-cases-heading"
      className="relative mx-auto max-w-5xl px-6 py-12 md:py-16"
    >
      <div className="mx-auto max-w-2xl text-left">
        <h2
          id="use-cases-heading"
          className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          What should we automate?
        </h2>
        <p className="mt-4 text-lg/8 text-foreground/80">
          Start with the work your people shouldn&apos;t have to do.
        </p>
      </div>
      <ul className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {USE_CASES.map((useCase) => (
          <li
            key={useCase}
            className="rounded-lg border border-border px-4 py-3 text-left text-base text-foreground"
          >
            {useCase}
          </li>
        ))}
      </ul>
    </section>
  );
}
