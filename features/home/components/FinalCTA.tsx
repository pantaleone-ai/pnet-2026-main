import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function FinalCTA() {
  return (
    <section
      aria-labelledby="final-cta-heading"
      className="relative mx-auto max-w-5xl px-6 py-16 md:py-24"
    >
      <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-8 text-center shadow-xs md:p-12">
        <h2
          id="final-cta-heading"
          className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
        >
          Bring us one workflow.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg/8 text-pretty text-foreground/80">
          Let&apos;s determine whether it&apos;s worth automating, what to
          build, and what it would take.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:items-center">
          <Button asChild size="lg" className="min-h-11 w-full sm:w-auto">
            <Link href="/contact?book=true">Book a working session</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
