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
    <div className="relative mx-auto max-w-5xl overflow-hidden lg:p-8">
      <BackgroundDots gridId="hero" className="text-gray-200/80" />
      <div className="relative z-10 border-border-edge lg:border lg:border-dashed">
        <div className="mx-auto grid w-full max-w-2xl grid-cols-1 divide-y divide-dashed divide-border-edge">
          <h1 className="px-4 py-2 text-left text-[32px] font-semibold tracking-tight text-foreground sm:text-[40px]">
            We build AI systems that eliminate expensive manual work.
          </h1>

          <p className="px-4 py-4 pb-8 text-left text-lg/8 text-foreground/80">
            We automate high-value workflows, deploy AI agents, and ship
            software that turns repetitive work into systems that run
            themselves.
          </p>

          <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/contact?book=true">Book a working session</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Link href="#proof">See what we build</Link>
            </Button>
          </div>
          <p className="px-4 py-3 text-left text-sm text-muted-foreground">
            Bring one process. We scope it or rule it out in 30 minutes.
          </p>

          <ul
            className="space-y-2 divide-y divide-dashed divide-border-edge"
            aria-label="Capabilities"
          >
            {PILLARS.map((item) => (
              <li key={item.title} className="relative py-2 pl-4 last:mb-20">
                <div className="flex flex-row gap-x-1">
                  <span className="text-left font-semibold text-foreground">
                    {item.title}:
                  </span>
                  <span className="text-left text-foreground/80">
                    {item.description}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
