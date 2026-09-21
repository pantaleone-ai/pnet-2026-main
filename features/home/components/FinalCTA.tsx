import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function FinalCTA() {
  return (
    <section
      aria-labelledby="final-cta-heading"
      className="relative mx-auto max-w-5xl px-6 py-16 md:py-24"
    >
      <div className="mx-auto max-w-2xl rounded-xl border border-border p-8 text-center md:p-12">
        <h2
          id="final-cta-heading"
          className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
        >
          Bring us one workflow.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg/8 text-foreground/80">
          If a process in your business is expensive, repetitive, or hard to
          scale, let&apos;s determine whether AI can take it over.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:items-center">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/contact?book=true">Book a working session</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
            <Link href="#proof">See what we build</Link>
          </Button>
        </div>
        <p className="mx-auto mt-6 max-w-xl text-sm text-muted-foreground">
          Bring one process. We help determine whether it is worth automating,
          what the system could look like, and what it would take to build.
        </p>
      </div>
    </section>
  );
}
