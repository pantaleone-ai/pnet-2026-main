export type BlueprintTypeId =
  | "ai-agent"
  | "automation-workflow"
  | "agentic-workflow";

type BlueprintFrontmatter = {
  title: string;
  description: string;
  created: string;
  lastUpdated?: string;
  image: string;
  imageAlt?: string;
  author?: string;
  blueprintType: BlueprintTypeId;
  category: string;
  tags?: string[];
  techStacks?: string[];
  integrations?: string[];
  hasCodePackage: boolean;
  codeUrl?: string;
  workflowFile?: string;
  difficulty?: string;
  seo?: string[];
  status?: string;
};

export type { BlueprintFrontmatter };
