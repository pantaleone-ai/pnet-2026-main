import Link from "next/link";
import { cn } from "@/lib/utils";

interface ConsultationCTAProps {
  title?: string;
  description?: string;
  buttonText?: string;
  buttonHref?: string;
  className?: string;
}

export function ConsultationCTA({
  title = "Ready to Transform Your Business?",
  description = "Let's discuss how AI can solve your specific challenges. Book a free 30-minute discovery call.",
  buttonText = "Book Free Consultation",
  buttonHref = "/contact?book=true",
  className,
}: ConsultationCTAProps) {
  return (
    <div
      className={cn(
        "my-8 p-6 border border-primary/20 rounded-lg bg-primary/5",
        className,
      )}
    >
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4 text-sm">{description}</p>
      <Link
        href={buttonHref}
        className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        {buttonText}
      </Link>
    </div>
  );
}