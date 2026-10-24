"use client";

import LinkWrapper from "@/components/LinkWrapper";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { LLMCopyButtonWithViewOptions } from "@/features/blog/components/buttons/ActionButton";
import { ShareButton } from "@/features/blog/components/buttons/ShareButton";
import BackButton from "@/features/blog/components/buttons/BackButton";

/**
 * Minimal item shape for prev/next navigation. Blog posts and AI blueprints
 * both satisfy this, so one navigation component serves both sections.
 */
type PostNavigationItem = {
  slug: string;
  title: string;
};

interface BlogPostNavigationProps {
  post: PostNavigationItem;
  previous?: PostNavigationItem;
  next?: PostNavigationItem;
  /**
   * Route prefix for links, e.g. "/blog" (default) or "/ai-blueprints".
   * The markdown alternate resolves to `${basePath}.mdx/${slug}`.
   */
  basePath?: string;
}

export default function BlogPostNavigation({
  post,
  previous,
  next,
  basePath = "/blog",
}: BlogPostNavigationProps) {
  return (
    <div className="flex items-center justify-between p-2 pl-4">
      <BackButton />

      <div className="flex items-center gap-2">
        <LLMCopyButtonWithViewOptions
          markdownUrl={`${basePath}.mdx/${post.slug}`}
        />

        <ShareButton url={`${basePath}/${post.slug}`} />

        {previous && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-7 w-7 border border-border-edge rounded-md"
                asChild
              >
                <LinkWrapper href={`${basePath}/${previous.slug}`}>
                  <ArrowLeftIcon className="h-4 w-4" />
                  <span className="sr-only">Previous: {previous.title}</span>
                </LinkWrapper>
              </Button>
            </TooltipTrigger>

            <TooltipContent className="pr-2 pl-3">
              <div className="flex items-center gap-3">
                <span>Previous Post</span>
                <KbdGroup>
                  <Kbd>
                    <ArrowLeftIcon className="h-3 w-3" />
                  </Kbd>
                </KbdGroup>
              </div>
            </TooltipContent>
          </Tooltip>
        )}

        {next && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-7 w-7 border border-border-edge rounded-md"
                asChild
              >
                <LinkWrapper href={`${basePath}/${next.slug}`}>
                  <span className="sr-only">Next: {next.title}</span>
                  <ArrowRightIcon className="h-4 w-4" />
                </LinkWrapper>
              </Button>
            </TooltipTrigger>

            <TooltipContent className="pr-2 pl-3">
              <div className="flex items-center gap-3">
                <span>Next Post</span>
                <KbdGroup>
                  <Kbd>
                    <ArrowRightIcon className="h-3 w-3" />
                  </Kbd>
                </KbdGroup>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
