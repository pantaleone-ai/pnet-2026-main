import { getProjects } from "@/features/projects/data/projectSource";
import { PORTFOLIO_APPS } from "@/config/portfolio";

export type ProjectsPageCard = {
  key: string;
  anchor: string;
  name: string;
  description: string;
  category: string;
  year?: string;
  imageSrc: string;
  imageAlt: string;
  href?: string;
  hostname?: string;
};

export type ProjectGroup = {
  id: string;
  heading: string;
  description: string;
  items: ProjectsPageCard[];
};

function hostnameOf(url?: string): string | undefined {
  if (!url || url === "#") return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function yearOf(fromDate?: string): string | undefined {
  if (!fromDate) return undefined;
  const match = fromDate.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : undefined;
}

function toCard(input: {
  key: string;
  name: string;
  description: string;
  category?: string;
  fromDate?: string;
  imageSrc: string;
  imageAlt: string;
  href?: string;
}): ProjectsPageCard {
  const hostname = hostnameOf(input.href);
  return {
    key: input.key,
    anchor: input.key
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, ""),
    name: input.name,
    description: input.description,
    category: input.category?.trim() || "Project",
    year: yearOf(input.fromDate),
    imageSrc: input.imageSrc,
    imageAlt: input.imageAlt || `${input.name} preview`,
    href: hostname ? input.href : undefined,
    hostname,
  };
}

/**
 * Curated portfolio for /projects. Explicit ordering — strongest, most
 * polished, most useful products first. Featured items are excluded from
 * the grouped "More projects" section so nothing renders twice.
 *
 * Matching is by live hostname (stable across title-casing edits), with a
 * title fallback for the one record without a websiteUrl (Pantaleone.net).
 */
const FEATURED_HOSTNAMES = [
  "aiceo.io",
  "aicapturelab.com",
  "proswing.net",
  "mixphd.com",
] as const;

const LEAD_HOSTNAME = "aiceo.io";

const GROUP_DEFINITIONS: Array<{
  id: string;
  heading: string;
  description: string;
  hostnames: string[];
  titles: string[];
}> = [
  {
    id: "ai-products",
    heading: "AI products",
    description: "Applied AI — agents, assistants, and market tools.",
    hostnames: ["profitsignals.xyz", "agentdna.ai"],
    titles: [],
  },
  {
    id: "creative-consumer",
    heading: "Creative and consumer applications",
    description: "Products for art, objects, and everyday use.",
    hostnames: ["synthetic.pics", "print3dmodels.com"],
    titles: [],
  },
  {
    id: "developer-tools",
    heading: "Developer tools and infrastructure",
    description: "Starters, migration tools, and utilities for shipping software.",
    hostnames: [
      "imgsquash.com",
      "migratecms.vercel.app",
      "qr-generator-pantaleone.vercel.app",
      "saas-ai-starter.vercel.app",
    ],
    titles: [],
  },
  {
    id: "experiments",
    heading: "Experiments",
    description:
      "Smaller explorations worth showing, kept separate from flagship products.",
    hostnames: ["aiskillsnap.vercel.app"],
    titles: ["Pantaleone.net"],
  },
];

function buildCatalog(): ProjectsPageCard[] {
  const fromSource = getProjects().map((p, index) =>
    toCard({
      key: `mdx-${p.title}-${index}`,
      name: p.title,
      description: p.description,
      category: p.category,
      fromDate: p.fromDate,
      imageSrc: p.imageUrl,
      imageAlt: p.imageAlt ?? "",
      href: p.websiteUrl,
    }),
  );

  const knownHostnames = new Set(
    fromSource.map((c) => c.hostname).filter((h): h is string => Boolean(h)),
  );

  const extras = PORTFOLIO_APPS.filter(
    (app) => !knownHostnames.has(hostnameOf(app.domain) ?? ""),
  ).map((app) =>
    toCard({
      key: `portfolio-${app.id}`,
      name: app.name,
      description: app.description,
      category: app.category,
      imageSrc: app.image.src,
      imageAlt: app.image.alt,
      href: app.domain,
    }),
  );

  return [...fromSource, ...extras];
}

function matches(card: ProjectsPageCard, hostnames: string[], titles: string[]) {
  if (card.hostname && (hostnames as string[]).includes(card.hostname)) {
    return true;
  }
  return titles.some(
    (t) => t.toLowerCase() === card.name.toLowerCase(),
  );
}

export function getProjectsPageData(): {
  lead: ProjectsPageCard;
  supporting: ProjectsPageCard[];
  groups: ProjectGroup[];
  all: ProjectsPageCard[];
} {
  const catalog = buildCatalog();
  const byHostname = new Map(
    catalog.map((c) => [c.hostname ?? c.key, c]),
  );

  const featured = FEATURED_HOSTNAMES.map((h) => byHostname.get(h)).filter(
    (c): c is ProjectsPageCard => Boolean(c),
  );
  const lead = featured.find((c) => c.hostname === LEAD_HOSTNAME) ?? featured[0];
  const supporting = featured.filter((c) => c.key !== lead?.key);

  if (!lead) {
    throw new Error("Projects page curation found no featured projects.");
  }

  const featuredKeys = new Set(featured.map((c) => c.key));
  const groups: ProjectGroup[] = GROUP_DEFINITIONS.map((def) => ({
    id: def.id,
    heading: def.heading,
    description: def.description,
    items: catalog.filter(
      (c) => !featuredKeys.has(c.key) && matches(c, def.hostnames, def.titles),
    ),
  })).filter((g) => g.items.length > 0);

  return { lead, supporting, groups, all: [lead, ...supporting] };
}
