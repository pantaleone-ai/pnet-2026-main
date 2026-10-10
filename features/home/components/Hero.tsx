import BackgroundDots from "@/features/common/components/BackgroundDots";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const PILLARS = [
  {
    title: "Automate work",
    description: "Replace repetitive manual processes with systems.",
  },
  {
    title: "Build agents",
    description: "Agents that research, reason, and do multi-step work.",
  },
  {
    title: "Ship software",
    description: "Apps and integrations that make AI useful in-house.",
  },
];

export default function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative mx-auto max-w-5xl overflow-hidden lg:p-8"
    >
      <BackgroundDots gridId="hero" className="text-gray-200/80" />
      <div className="relative z-10 border-border-edge lg:border lg:border-dashed">
        <div className="mx-auto grid w-full max-w-2xl grid-cols-1 divide-y divide-dashed divide-border-edge">
          <div className="px-4 pt-6 pb-2 sm:pt-8">
            <p className="text-left text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              AI systems for operations
            </p>
            <h1
              id="hero-heading"
              className="mt-2 max-w-xl text-left text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl sm:leading-[1.05]"
            >
              We build AI systems that eliminate expensive manual work.
            </h1>
          </div>

          <p className="px-4 py-5 text-left text-lg/8 text-pretty text-foreground/80">
            We automate high-value workflows, deploy AI agents, and ship
            software that turns repetitive work into systems that run
            themselves.
          </p>

          <div className="flex flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="min-h-11 w-full sm:w-auto">
              <Link href="/contact?book=true">Book a working session</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="min-h-11 w-full sm:w-auto"
            >
              <Link href="/projects">See what we build</Link>
            </Button>
          </div>
          <p className="px-4 pb-5 text-left text-sm text-muted-foreground">
            Bring one process. We scope it or rule it out in 30 minutes.{" "}
            Looking for a product?{" "}
            <Link
              href="/apps"
              className="underline underline-offset-4"
            >
              Explore our software
            </Link>
            .
          </p>

          <ul
            className="divide-y divide-dashed divide-border-edge"
            aria-label="Capabilities"
          >
            {PILLARS.map((item) => (
              <li key={item.title} className="relative px-4 py-3">
                <p className="text-left">
                  <span className="font-semibold text-foreground">
                    {item.title}:{" "}
                  </span>
                  <span className="text-foreground/80">{item.description}</span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
