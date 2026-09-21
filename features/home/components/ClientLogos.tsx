import HeadingTitle from "@/components/HeadingTitle";
import SeparatorHorizontal from "@/components/SeparatorHorizontal";

const facts = [
  {
    value: "900+",
    label: "marketplace feedback entries, 2002–2022",
  },
  {
    value: "9+",
    label: "documented projects shipped and listed on this site",
  },
  {
    value: "30+",
    label: "published build notes on AI systems and automation",
  },
];

export default function ClientLogos() {
  return (
    <section className="py-12">
      <HeadingTitle title="Track record, stated plainly" />
      <SeparatorHorizontal short={true} />

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 md:grid-cols-3">
        {facts.map((fact) => (
          <div
            key={fact.label}
            className="rounded-lg border border-border/50 bg-muted/50 p-6"
          >
            <p className="mb-2 text-3xl font-bold">{fact.value}</p>
            <p className="text-sm text-muted-foreground">{fact.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="mb-4 text-muted-foreground">
          AI agents, N8N workflows, and Next.js apps. Built to ship, not to
          demo.
        </p>
        <a
          href="/contact?book=true"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Book a working session
        </a>
      </div>
    </section>
  );
}
