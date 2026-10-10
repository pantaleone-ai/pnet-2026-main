import Link from "next/link";

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
          Start with the work your people shouldn&apos;t have to do.{" "}
          <Link href="/services" className="underline underline-offset-4">
            How engagements work
          </Link>
          .
        </p>
      </div>
      <ul
        aria-label="Example workflows"
        className="mx-auto mt-8 flex max-w-5xl flex-wrap gap-2"
      >
        {USE_CASES.map((useCase) => (
          <li
            key={useCase}
            className="rounded-full border border-border px-4 py-1.5 text-sm text-foreground/80"
          >
            {useCase}
          </li>
        ))}
      </ul>
    </section>
  );
}
