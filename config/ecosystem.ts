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
// - https://rapigent.com — DNS live, http 308 to https; https TLS failed
//   locally (LibreSSL vs server TLS), kept as canonical per codebase use.
// - https://www.aiceo.io (from aiceo.io) — 200
// - https://imgsquash.com — live (429 on HEAD = rate-limit, not dead)
// - https://www.mixphd.com (from mixphd.com) — 200
// - https://www.profitsignals.xyz (from profitsignals.xyz) — 200
// - https://www.aicapturelab.com (from aicapturelab.com) — 200
// - https://www.synthetic.pics (from synthetic.pics) — 200
// - https://www.proswing.net (from proswing.net) — 200
// Excluded: Agent Library (no canonical URL on file), QR Code Generator
// (canonical is a Vercel dev URL — do not expose per link strategy).
export const ECOSYSTEM_GROUPS: EcosystemGroup[] = [
  {
    heading: "AI & Automation",
    links: [
      { label: "Rapigent — AI Automation Agency", href: "https://rapigent.com" },
      { label: "AICEO — AI Executive Platform", href: "https://aiceo.io" },
    ],
  },
  {
    heading: "Products & Labs",
    links: [
      {
        label: "AI Capture Lab — Virtual Product Photography",
        href: "https://aicapturelab.com",
      },
      {
        label: "Synthetic Pics — Generative Art",
        href: "https://synthetic.pics",
      },
      {
        label: "ImgSquash — Image Compression",
        href: "https://imgsquash.com",
      },
      {
        label: "ProfitSignals — AI Market Intelligence",
        href: "https://profitsignals.xyz",
      },
    ],
  },
  {
    heading: "Apps & Experiments",
    links: [
      { label: "MixPHD — Drink Recipes", href: "https://mixphd.com" },
      { label: "ProSwing — Golf Swing Analysis", href: "https://proswing.net" },
    ],
  },
];

export const ECOSYSTEM_URLS = ECOSYSTEM_GROUPS.flatMap((group) =>
  group.links.map((link) => link.href),
);
