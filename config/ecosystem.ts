import { PORTFOLIO_APPS } from "@/config/portfolio";

export type EcosystemLink = {
  label: string;
  href: string;
  description?: string;
};

export type EcosystemGroup = {
  heading: string;
  links: EcosystemLink[];
};

// Active ecosystem properties only.
// Verification 2026-09-21 (curl -L):
// - https://www.aiceo.io (from aiceo.io) — 200
// - https://imgsquash.com — live (429 on HEAD = rate-limit, not dead)
// - https://www.mixphd.com (from mixphd.com) — 200
// - https://www.profitsignals.xyz (from profitsignals.xyz) — 200
// - https://www.aicapturelab.com (from aicapturelab.com) — 200
// - https://www.synthetic.pics (from synthetic.pics) — 200
// - https://www.proswing.net (from proswing.net) — 200
// Verification 2026-10-01:
// - https://www.print3dmodels.com — live storefront (printed-to-order).
// Excluded: Agent Library (no canonical URL on file), QR Code Generator
// (canonical is a Vercel dev URL — do not expose per link strategy).
//
// Derived from the portfolio registry (config/portfolio.ts) so footer,
// llms.txt, and /apps stay in sync. Grouping preserved for stable footer
// rendering.
const LABELS: Record<string, string> = {
  aiceo: "AICEO — AI Executive Platform",
  aicapturelab: "AI Capture Lab — Virtual Product Photography",
  "synthetic-pics": "Synthetic Pics — Generative Art",
  imgsquash: "ImgSquash — Image Compression",
  profitsignals: "ProfitSignals — AI Market Intelligence",
  print3dmodels: "Print3DModels — 3D Prints",
  mixphd: "MixPHD — Drink Recipes",
  proswing: "ProSwing — Baseball Swing Analysis",
};

function linkFor(id: string): EcosystemLink {
  const app = PORTFOLIO_APPS.find((a) => a.id === id);
  if (!app) throw new Error(`Portfolio app missing for ecosystem id: ${id}`);
  return { label: LABELS[id] ?? app.name, href: app.domain };
}

export const ECOSYSTEM_GROUPS: EcosystemGroup[] = [
  {
    heading: "AI & Automation",
    links: [linkFor("aiceo")],
  },
  {
    heading: "Products & Labs",
    links: [
      linkFor("aicapturelab"),
      linkFor("synthetic-pics"),
      linkFor("imgsquash"),
      linkFor("profitsignals"),
      linkFor("print3dmodels"),
    ],
  },
  {
    heading: "Lifestyle Apps",
    links: [linkFor("mixphd"), linkFor("proswing")],
  },
];

export const ECOSYSTEM_URLS = ECOSYSTEM_GROUPS.flatMap((group) =>
  group.links.map((link) => link.href),
);
