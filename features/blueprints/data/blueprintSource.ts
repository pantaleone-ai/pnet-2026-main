import { blueprints } from "@/.source/server";
import type { BlueprintType } from "@/features/blueprints/types/BlueprintType";
import { cache } from "react";
import fs from "fs";
import type { Source, SourceConfig } from "fumadocs-core/source";
import { loader } from "fumadocs-core/source";
import path from "path";
import readingTime from "reading-time";
import type { BlueprintFrontmatter } from "@/features/blueprints/types/BlueprintFrontmatter";

const blueprintDocs = blueprints as unknown as {
  toFumadocsSource: () => unknown;
};

export const blueprintSource = loader({
  baseUrl: "/ai-blueprints",
  source: blueprintDocs.toFumadocsSource() as Source<SourceConfig>,
});

type BlueprintPage = ReturnType<typeof blueprintSource.getPages>[number];

// Fallback only: used when a blueprint has no frontmatter image.
export const BLUEPRINT_PLACEHOLDER_IMAGE = "/images/logo.png";

function toBlueprint(page: BlueprintPage): BlueprintType | null {
  const data = page.data as unknown as BlueprintFrontmatter & {
    body: React.ComponentType<object>;
  };

  // Drafts and unpublished entries never reach public listings.
  if (data.status !== undefined && data.status !== "published") {
    return null;
  }

  const pageWithFile = page as BlueprintPage & { file: { path: string } };
  const slug = page.slugs.join("/");

  let filePath = "";
  if (pageWithFile.file?.path) {
    filePath = path.join(
      process.cwd(),
      "features/blueprints/content",
      pageWithFile.file.path,
    );
  } else if (slug) {
    filePath = path.join(
      process.cwd(),
      "features/blueprints/content",
      `${slug}.mdx`,
    );
  }

  if (!filePath || (filePath && !fs.existsSync(filePath))) {
    return {
      title: data.title,
      description: data.description,
      created: data.created,
      lastUpdated: data.lastUpdated,
      image: data.image || BLUEPRINT_PLACEHOLDER_IMAGE,
      imageAlt: data.imageAlt,
      author: data.author,
      blueprintType: data.blueprintType,
      category: data.category,
      tags: data.tags,
      techStacks: data.techStacks,
      integrations: data.integrations,
      hasCodePackage: data.hasCodePackage ?? false,
      codeUrl: data.codeUrl,
      workflowFile: data.workflowFile,
      difficulty: data.difficulty,
      seo: data.seo,
      status: data.status,
      body: () => null,
      content: "",
      readingTime: "",
      readingTimeMinutes: 0,
      slug,
    };
  }

  const contentStr = fs.readFileSync(filePath, "utf-8");
  const readingTimeStats = readingTime(contentStr);

  return {
    title: data.title,
    description: data.description,
    created: data.created,
    lastUpdated: data.lastUpdated,
    image: data.image || BLUEPRINT_PLACEHOLDER_IMAGE,
    imageAlt: data.imageAlt,
    author: data.author,
    blueprintType: data.blueprintType,
    category: data.category,
    tags: data.tags,
    techStacks: data.techStacks,
    integrations: data.integrations,
    hasCodePackage: data.hasCodePackage ?? false,
    codeUrl: data.codeUrl,
    workflowFile: data.workflowFile,
    difficulty: data.difficulty,
    seo: data.seo,
    status: data.status,
    body: data.body,
    content: contentStr,
    readingTime: readingTimeStats.text,
    readingTimeMinutes: Math.round(readingTimeStats.minutes),
    slug,
  };
}

export const getBlueprints = cache(function getBlueprints(): BlueprintType[] {
  return blueprintSource
    .getPages()
    .map(toBlueprint)
    .filter((b): b is BlueprintType => b !== null)
    .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
});

export const getBlueprintBySlug = cache(function getBlueprintBySlug(
  slug: string,
): BlueprintType | null {
  return getBlueprints().find((b) => b.slug === slug) ?? null;
});
