import LinkWrapper from "@/components/LinkWrapper";
import type { BlogPostType } from "@/features/blog/types/BlogPostType";
import { getInventory } from "@/config/content/inventory";

type PostLite = Pick<BlogPostType, "slug" | "title" | "description" | "category">;

type Props = {
  related: PostLite[];
  continueReading?: PostLite;
  hubLabel?: string;
  hubPath?: string;
};

/**
 * Contextual internal-linking block.
 * Render AFTER article body, BEFORE commercial CTA.
 * Rules: 3-5 related max, 1 continue-reading, 1 hub link back.
 */
export default function RelatedArticles({ related, continueReading, hubLabel, hubPath = "/blog" }: Props) {
  if (related.length === 0 && !continueReading) return null;
  return (
    <section aria-label="Related articles" className="mx-auto w-full max-w-3xl px-6 py-8">
      {continueReading ? (
        <div className="mb-6">
          <p className="text-sm font-medium tracking-wide text-muted-foreground">Continue reading</p>
          <LinkWrapper href={`/blog/${continueReading.slug}`} className="mt-1 block text-lg font-semibold underline-offset-4 hover:underline">
            {continueReading.title}
          </LinkWrapper>
        </div>
      ) : null}
      {related.length > 0 ? (
        <div>
          <p className="text-sm font-medium tracking-wide text-muted-foreground">Related</p>
          <ul className="mt-2 space-y-3">
            {related.slice(0, 4).map((post) => (
              <li key={post.slug}>
                <LinkWrapper href={`/blog/${post.slug}`} className="font-medium underline-offset-4 hover:underline">
                  {post.title}
                </LinkWrapper>
                {post.description ? (
                  <p className="text-sm text-muted-foreground">{post.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="mt-6 text-sm">
        <LinkWrapper href={hubPath} className="text-muted-foreground underline-offset-4 hover:underline">
          {hubLabel ?? "More in this topic →"}
        </LinkWrapper>
      </p>
    </section>
  );
}

export function hubLabelFor(slug: string): string | undefined {
  const entry = getInventory(slug);
  if (!entry) return undefined;
  return `More on ${entry.cluster.replace(/-/g, " ")} →`;
}
