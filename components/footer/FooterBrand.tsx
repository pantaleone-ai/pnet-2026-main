import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function FooterBrand() {
  return (
    <div className="mx-auto w-full max-w-5xl border-x border-edge">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 px-4 py-10 text-center">
        <p className="text-base font-semibold text-foreground">Pantaleone</p>
        <p className="text-sm text-muted-foreground">
          AI systems that run themselves.
        </p>
        <p className="max-w-md text-sm text-muted-foreground">
          AI engineering, automation, agents, and software built to run real
          work.
        </p>
        <Link
          href="/contact?book=true"
          prefetch={false}
          className={cn(buttonVariants({ variant: "default", size: "sm" }), "mt-2")}
        >
          Book a call
        </Link>
      </div>
    </div>
  );
}
