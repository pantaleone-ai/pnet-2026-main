"use client";

import LinkWrapper from "@/components/LinkWrapper";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import DateIcon from "@/features/common/icons/date-icon";
import ReadingTimeIcon from "@/features/common/icons/reading-time-icon";
import type { BlueprintType } from "@/features/blueprints/types/BlueprintType";
import { formatDate } from "@/lib/helpers";
import { trackEvent } from "@/lib/events";
import { cn } from "@/lib/utils";
import { ArrowRightIcon } from "lucide-react";
import Image from "next/image";

const TYPE_LABELS: Record<BlueprintType["blueprintType"], string> = {
  "ai-agent": "AI Agent",
  "automation-workflow": "Automation Workflow",
  "agentic-workflow": "Agentic Workflow",
};

interface BlueprintCardProps {
  blueprint: Omit<BlueprintType, "body">;
  index: number;
}

export default function BlueprintCard({ blueprint, index }: BlueprintCardProps) {
  const href = `/ai-blueprints/${blueprint.slug}`;

  return (
    <Card
      className={cn(
        "group h-full gap-0 rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-black/5 hover:border-primary/20 hover:bg-card/80",
        "hover:-translate-y-1",
      )}
      style={{ contentVisibility: index > 2 ? "auto" : "visible" }}
      role="article"
      aria-labelledby={`blueprint-title-${index}`}
    >
      <LinkWrapper href={href} className="block cursor-pointer">
        <div className="relative w-full overflow-hidden rounded-t-lg bg-muted/20">
          <div className="relative aspect-[4/3] w-full overflow-hidden group-hover:scale-105 transition-transform duration-500 ease-out">
            <Image
              alt={blueprint.imageAlt || blueprint.title}
              src={blueprint.image || "/images/logo.png"}
              fill
              className="object-cover object-top transition-transform duration-500 ease-out group-hover:scale-110"
              sizes="(max-width: 1023px) 100vw, 33vw"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        </div>
      </LinkWrapper>

      <div className="flex w-full items-stretch justify-between">
        <div className="flex flex-1 flex-col">
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-foreground">
                {TYPE_LABELS[blueprint.blueprintType]}
              </span>
              {blueprint.hasCodePackage ? (
                <span className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
                  Code included
                </span>
              ) : (
                <span className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
                  Guide
                </span>
              )}
            </div>

            <LinkWrapper href={href} className="group/title block">
              <CardTitle
                id={`blueprint-title-${index}`}
                className="line-clamp-2 text-lg font-bold leading-tight text-foreground group-hover/title:text-primary transition-colors"
              >
                {blueprint.title}
              </CardTitle>
            </LinkWrapper>

            <CardDescription className="line-clamp-3 text-sm text-muted-foreground">
              {blueprint.description}
            </CardDescription>

            {(blueprint.techStacks?.length ?? 0) > 0 && (
              <p className="text-xs text-muted-foreground font-mono line-clamp-1">
                {blueprint.techStacks?.join(" · ")}
              </p>
            )}

            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <DateIcon size={16} className="text-muted-foreground" />
                <span className="font-mono">
                  {blueprint.created
                    ? formatDate(blueprint.created as string)
                    : "No date"}
                </span>
              </div>
              {blueprint.readingTimeMinutes !== undefined && (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  <div className="flex items-center gap-1">
                    <ReadingTimeIcon
                      size={16}
                      className="text-muted-foreground"
                    />
                    <span className="font-mono">
                      {blueprint.readingTimeMinutes} min
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end pt-2">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="h-8 px-2 text-sm hover:bg-transparent hover:text-primary transition-colors"
                onClick={() => {
                  trackEvent({
                    name: "blueprint_read_more_clicked",
                    properties: {
                      blueprint_title: blueprint.title,
                      blueprint_slug: blueprint.slug,
                      blueprint_type: blueprint.blueprintType,
                    },
                  });
                }}
              >
                <LinkWrapper
                  href={href}
                  className="group/btn flex items-center gap-1"
                >
                  Read blueprint
                  <span className="sr-only"> about {blueprint.title}</span>
                  <ArrowRightIcon className="size-3 transition-transform duration-300 group-hover/btn:translate-x-1" />
                </LinkWrapper>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
