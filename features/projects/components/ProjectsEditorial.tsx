import TrackedCta from "@/components/TrackedCta";
import type { ProjectsPageCard } from "@/features/projects/data/projectsPage";
import { cn } from "@/lib/utils";
import Image from "next/image";

function Meta({ card }: { card: ProjectsPageCard }) {
  return (
    <p className="text-xs tracking-wide text-muted-foreground uppercase">
      {card.category}
      {card.year ? ` · ${card.year}` : ""}
    </p>
  );
}

function VisitLink({ card, className }: { card: ProjectsPageCard; className?: string }) {
  if (!card.href || !card.hostname) return null;
  return (
    <TrackedCta
      href={card.href}
      ctaType="outbound-product"
      ctaLabel={card.name}
      className={cn(
        "group/link inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline",
        className,
      )}
    >
      Visit {card.hostname}
      <span aria-hidden="true" className="transition-transform duration-200 group-hover/link:translate-x-0.5 motion-reduce:transition-none motion-reduce:transform-none">→</span>
      <span className="sr-only"> — {card.name} (opens in a new tab)</span>
    </TrackedCta>
  );
}

export function FeaturedLeadCard({ card }: { card: ProjectsPageCard }) {
  return (
    <article
      aria-labelledby="featured-lead-title"
      className="group grid grid-cols-1 overflow-hidden rounded-lg border border-edge text-left transition-colors hover:border-muted-foreground md:grid-cols-12"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted/20 md:col-span-7 md:aspect-auto md:min-h-[320px]">
        <Image
          src={card.imageSrc}
          alt={card.imageAlt}
          fill
          className="object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:transform-none"
          sizes="(max-width: 768px) 100vw, 60vw"
          priority
        />
      </div>
      <div className="flex flex-col justify-center p-6 md:col-span-5 md:p-8">
        <Meta card={card} />
        <h3 id="featured-lead-title" className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          {card.name}
        </h3>
        <p className="mt-3 text-base text-foreground/80">{card.description}</p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {card.hostname ? `Live · ${card.hostname}` : "In development"}
          </span>
          <VisitLink card={card} />
        </div>
      </div>
    </article>
  );
}

export function ProjectCard({
  card,
  titleId,
}: {
  card: ProjectsPageCard;
  titleId: string;
}) {
  return (
    <article
      aria-labelledby={titleId}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-edge text-left transition-colors hover:border-muted-foreground"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted/20">
        <Image
          src={card.imageSrc}
          alt={card.imageAlt}
          fill
          className="object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:transform-none"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          loading="lazy"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <Meta card={card} />
        <h3 id={titleId} className="mt-1.5 text-lg font-semibold text-foreground">
          {card.name}
        </h3>
        <p className="mt-2 text-sm text-foreground/80">{card.description}</p>
        <div className="mt-4 flex flex-1 items-end justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {card.hostname ? `Live · ${card.hostname}` : "This site"}
          </span>
          <VisitLink card={card} />
        </div>
      </div>
    </article>
  );
}
