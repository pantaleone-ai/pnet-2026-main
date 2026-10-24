import { cn } from "@/lib/utils";

export type BlueprintDiagramStep = {
  label: string;
  detail?: string;
};

interface BlueprintDiagramProps {
  steps: BlueprintDiagramStep[];
  caption?: string;
  className?: string;
}

const KIND_STYLES = [
  "border-primary/40 bg-primary/5",
  "border-border bg-card",
  "border-border bg-card",
  "border-border bg-card",
  "border-border bg-card",
  "border-edge bg-muted/20",
];

/**
 * Static, responsive flow diagram for AI Blueprints.
 * Pure Tailwind + semantic list markup: no diagramming dependency.
 * Vertical on mobile, horizontal scroll-free wrap on desktop.
 * Screen readers get the ordered steps; the arrows are decorative.
 */
export function BlueprintDiagram({
  steps,
  caption,
  className,
}: BlueprintDiagramProps) {
  if (!steps || steps.length === 0) return null;

  return (
    <figure
      className={cn(
        "not-prose my-8 rounded-xl border border-edge bg-card/50 p-4 sm:p-6",
        className,
      )}
    >
      <ol
        aria-label={caption ?? "System flow"}
        className="flex flex-col gap-2 md:flex-row md:items-stretch md:gap-0"
      >
        {steps.map((step, index) => (
          <li
            key={`${step.label}-${index}`}
            className="flex flex-1 flex-col md:min-w-0 md:flex-row md:items-stretch"
          >
            {index > 0 && (
              <span
                aria-hidden="true"
                className="flex items-center justify-center py-1 text-muted-foreground md:px-2 md:py-0"
              >
                <span className="text-lg leading-none md:hidden">↓</span>
                <span className="hidden text-lg leading-none md:inline">→</span>
              </span>
            )}
            <div
              className={cn(
                "flex flex-1 flex-col rounded-lg border p-3 text-left",
                KIND_STYLES[Math.min(index, KIND_STYLES.length - 1)],
              )}
            >
              <span className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
                Step {index + 1}
              </span>
              <span className="mt-1 text-sm font-semibold text-foreground">
                {step.label}
              </span>
              {step.detail && (
                <span className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {step.detail}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
      {caption && (
        <figcaption className="mt-4 text-center text-xs text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
