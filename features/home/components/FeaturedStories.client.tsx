import BackgroundDots from "@/features/common/components/BackgroundDots";
import { formatDate } from "@/lib/helpers";
import { ArrowRightIcon } from "lucide-react";
import Image from "next/image";
import type { BlogPostType } from "@/features/blog/types/BlogPostType";

type FeaturedStoryProps = Omit<BlogPostType, "body">;

export default function FeaturedStories({
  story,
}: {
  story: FeaturedStoryProps;
}) {
  return (
    <div className="relative mx-auto max-w-7xl px-6 py-8 md:py-10 lg:px-8">
      <BackgroundDots gridId="featured-stories" className="text-gray-200/80" />
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="flex flex-col justify-center p-6 md:p-10 lg:p-12">
            <div className="mb-4">
              <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                Featured Story
              </span>
            </div>
            <h2 className="mb-4 text-2xl font-bold leading-tight tracking-tight md:text-3xl lg:text-4xl">
              {story.title}
            </h2>
            <p className="mb-6 line-clamp-3 text-sm leading-relaxed text-muted-foreground md:text-base">
              {story.description}
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono">
                  {story.created ? formatDate(story.created) : ""}
                </span>
                {story.readingTimeMinutes > 0 && (
                  <>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="font-mono">
                      {story.readingTimeMinutes} min read
                    </span>
                  </>
                )}
              </div>
              <a
                href={`/blog/${story.slug}`}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-full sm:w-auto"
              >
                Read
                <ArrowRightIcon className="ml-2 size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </a>
            </div>
          </div>
          <div className="relative aspect-[4/3] lg:aspect-[4/3] overflow-hidden rounded-b-xl lg:rounded-r-xl lg:rounded-bl-none bg-muted/20">
            <Image
              src={story.image || "/images/app-placeholder.jpg"}
              alt={story.imageAlt || story.title}
              fill
              className="object-cover object-top"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-black/20 lg:bg-gradient-to-l lg:from-transparent lg:to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
}
