import dayjs from "dayjs";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";

import type { BlogPostType } from "@/features/blog/types/BlogPostType";

const processor = remark().use(remarkMdx).use(remarkGfm);

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[*_`#]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isDuplicateHeading(title: string, heading: string): boolean {
  const normalizedTitle = normalize(title);
  const normalizedHeading = normalize(heading);
  if (!normalizedTitle || !normalizedHeading) return false;
  if (normalizedTitle === normalizedHeading) return true;
  if (
    normalizedHeading.startsWith(normalizedTitle) ||
    normalizedTitle.startsWith(normalizedHeading)
  ) {
    return true;
  }
  const titleWords = new Set(normalizedTitle.split(" "));
  const headingWords = normalizedHeading.split(" ").filter(Boolean);
  if (headingWords.length === 0) return false;
  const overlap = headingWords.filter((word) => titleWords.has(word)).length;
  return overlap / headingWords.length >= 0.8;
}

export async function getLLMText(post: BlogPostType) {
  // Strip frontmatter
  const contentWithoutFrontmatter = post.content.replace(
    /^---[\s\S]+?---\s*/,
    "",
  );

  // The page chrome already renders `post.title` as the H1, and body files
  // must open with a distinct `##` that builds on the title (see
  // docs/EDITORIAL.md). If a body still opens with a `#` that duplicates the
  // title, drop that one line so LLM/AI-search consumers see the title once.
  const deduped = contentWithoutFrontmatter.replace(
    /^#\s+.*(?:\r?\n|$)/,
    (heading) => (isDuplicateHeading(post.title, heading) ? "" : heading),
  );

  const processed = await processor.process({
    value: deduped,
  });

  return `# ${post.title}

${post.description}

${processed.value}

Last updated on ${dayjs(post.lastUpdated || post.created).format(
    "MMMM D, YYYY",
  )}`;
}
