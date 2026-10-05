import { PORTFOLIO_APPS } from "@/config/portfolio";

export type PortfolioStatus =
  | "ACTIVE"
  | "DEVELOPMENT"
  | "PLANNED"
  | "ARCHIVED"
  | "NEEDS_REVIEW";

export type PortfolioClassification = {
  id: string;
  name: string;
  domain: string | null;
  status: PortfolioStatus;
  reason: string;
};

/**
 * Portfolio classification grounded in config/portfolio.ts.
 * Only the 8 registry apps are ACTIVE. Everything else from the
 * request brief is NEEDS_REVIEW until a domain/repo/status is confirmed.
 * Do not invent products, pricing, or capabilities.
 */
export const PORTFOLIO_CLASSIFICATION: PortfolioClassification[] = [
  ...PORTFOLIO_APPS.map((app) => ({
    id: app.id,
    name: app.name,
    domain: app.domain,
    status: "ACTIVE" as PortfolioStatus,
    reason: `Registry status live, activation ${app.primaryActivationEvent}`,
  })),
  {
    id: "agentdna",
    name: "AgentDNA",
    domain: "https://agentdna.ai",
    status: "NEEDS_REVIEW",
    reason: "Not in portfolio registry. Verify repo, domain, and conversion before scheduling.",
  },
  {
    id: "agentlibrary",
    name: "Agent Library",
    domain: null,
    status: "NEEDS_REVIEW",
    reason: "No canonical URL on file per ecosystem.ts. Do not expose until confirmed.",
  },
  {
    id: "qrgen",
    name: "QRGen",
    domain: null,
    status: "NEEDS_REVIEW",
    reason: "Canonical is a Vercel dev URL per ecosystem.ts. Do not promote until custom domain lands.",
  },
  {
    id: "pantaleone",
    name: "Pantaleone",
    domain: "https://www.pantaleone.net",
    status: "ACTIVE",
    reason: "Portfolio umbrella. Used for cross-portfolio discovery, not product conversion.",
  },
];

export const ACTIVE_APP_IDS = PORTFOLIO_CLASSIFICATION.filter((a) => a.status === "ACTIVE").map(
  (a) => a.id,
);
