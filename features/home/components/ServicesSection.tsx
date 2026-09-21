import Link from "next/link";

const SERVICES = [
  {
    index: "01",
    title: "AI agents",
    description:
      "Agents that research, reason, make decisions, and do multi-step tasks.",
    stack: "LLMs, tools, memory, retrieval, APIs, orchestration",
    href: "/services",
  },
  {
    index: "02",
    title: "Workflow automation",
    description: "Connect systems and automate repetitive business processes.",
    stack: "n8n, APIs, webhooks, databases, scheduled runs",
    href: "/services",
  },
  {
    index: "03",
    title: "AI integration",
    description: "Put AI into the systems your business already uses.",
    stack: "CRM, support, content, knowledge, analytics",
    href: "/b2b",
  },
  {
    index: "04",
    title: "Custom AI software",
    description: "Focused apps for when existing tools are not enough.",
    stack: "Internal tools, RAG, AI interfaces, custom APIs",
    href: "/services",
  },
];

export default function ServicesSection() {
  return (
    <section
      aria-labelledby="services-heading"
      className="relative mx-auto max-w-5xl px-6 py-12 md:py-16"
    >
      <div className="mx-auto max-w-2xl text-left">
        <h2
          id="services-heading"
          className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          AI systems built around your business.
        </h2>
        <p className="mt-4 text-lg/8 text-foreground/80">
          Not technology for its own sake. Systems that solve the business
          problem.
        </p>
      </div>
      <div className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2">
        {SERVICES.map((service) => (
          <Link
            key={service.index}
            href={service.href}
            className="group rounded-lg border border-border p-6 text-left transition-colors hover:border-foreground/30"
          >
            <p className="font-mono text-sm text-muted-foreground">
              {service.index}
            </p>
            <h3 className="mt-2 text-lg font-semibold text-foreground">
              {service.title}
            </h3>
            <p className="mt-2 text-base text-foreground/80">
              {service.description}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {service.stack}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
