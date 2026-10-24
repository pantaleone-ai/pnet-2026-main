import type { BlueprintFrontmatter } from "./BlueprintFrontmatter";

type BlueprintType = BlueprintFrontmatter & {
  body: React.ComponentType<object>;
  content: string;
  readingTime: string;
  readingTimeMinutes: number;
  slug: string;
};

export type { BlueprintType };
