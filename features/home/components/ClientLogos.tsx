import HeadingTitle from "@/components/HeadingTitle";
import SeparatorHorizontal from "@/components/SeparatorHorizontal";

// Hallmark gate 46 — honest copy. The previous version listed five invented
// client logos (TechCorp, InnovateLab, DataFlow, ScaleUp, AutomatePro) and
// three invented quotes with unverified metrics (40%, 120 hrs/mo). Removed
// 2026-09: no client logos or consulting testimonials on file. The eBay
// feedback export (907 rows, 2002–2022) was reviewed and contains only
// marketplace shipping/payment notes — not applicable to consulting proof,
// so it is cited here only as marketplace history, not as client results.

const marketplaceFacts = [
  {
    value: "900+",
    label: "marketplace feedback entries, 2002–2022",
  },
  {
    value: "—",
    label: "consulting metric to confirm after first measured build",
  },
  {
    value: "—",
    label: "client quote slot, filled only with a named, linked source",
  },
];

export default function ClientLogos() {
  return (
    <section className="py-12">
      <HeadingTitle title="Track record, stated plainly" />
      <SeparatorHorizontal short={true} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto px-4">
        {marketplaceFacts.map((fact) => (
          <div
            key={fact.label}
            className="bg-muted/50 rounded-lg p-6 border border-border/50"
          >
            <p className="text-3xl font-bold mb-2">{fact.value}</p>
            <p className="text-sm text-muted-foreground">{fact.label}</p>
          </div>
        ))}
      </div>

      <div className="text-center mt-12">
        <p className="text-muted-foreground mb-4">
          Selling N8N packs, Next.js starters, and prompt packs since 2024.
        </p>
        <a
          href="/contact"
          className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Book a call
        </a>
      </div>
    </section>
  );
}
