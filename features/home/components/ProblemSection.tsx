export default function ProblemSection() {
  return (
    <section
      aria-labelledby="problem-heading"
      className="relative mx-auto max-w-5xl px-6 py-12 md:py-16"
    >
      <div className="mx-auto max-w-2xl text-left">
        <h2
          id="problem-heading"
          className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          Most businesses don&apos;t need more AI. They need less manual work.
        </h2>
        <p className="mt-4 text-lg/8 text-foreground/80">
          The opportunity is usually hiding inside the work your team repeats
          every day. We find it, redesign it, and build systems that do more
          of it automatically.
        </p>
        <p className="mt-4 text-base text-muted-foreground">
          AI takes over appropriate repetitive work so people do higher-value
          work.
        </p>
      </div>
    </section>
  );
}
