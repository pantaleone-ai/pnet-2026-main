import LinkWrapper from "@/components/LinkWrapper";

// Verified live portfolio products only (see config/portfolio.ts).
// AgentDNA, MigrateCMS, QR Code Generator, SkillSnap, and the SaaS starter
// are intentionally absent here: they are prototypes, starters, or lack a
// verified live commercial URL, and must not be presented as live products.
const WORK = [
  {
    title: "Synthetic Pics",
    description:
      "Human-guided generative art gallery with purchasable downloads.",
    href: "https://www.synthetic.pics",
  },
  {
    title: "MixPHD",
    description: "Drink recipes, My Bar matching, and curated barware.",
    href: "https://www.mixphd.com",
  },
  {
    title: "ImgSquash",
    description: "Image compression tool.",
    href: "https://imgsquash.com/",
  },
];

export default function SelectedWork() {
  return (
    <section
      aria-labelledby="selected-work-heading"
      className="relative mx-auto max-w-5xl px-6 py-12 md:py-16"
    >
      <div className="mx-auto max-w-2xl text-left">
        <h2
          id="selected-work-heading"
          className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          Selected work
        </h2>
      </div>
      <ul className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3">
        {WORK.map((item) => (
          <li key={item.href}>
            <LinkWrapper
              href={item.href}
              className="group block h-full rounded-lg border border-border p-6 text-left transition-colors hover:border-foreground/30"
            >
              <h3 className="text-lg font-semibold text-foreground group-hover:underline group-hover:underline-offset-4">
                {item.title}
              </h3>
              <p className="mt-2 text-base text-foreground/80">
                {item.description}
              </p>
            </LinkWrapper>
          </li>
        ))}
      </ul>
      <p className="mx-auto mt-8 max-w-2xl text-left">
        <LinkWrapper href="/apps" className="underline underline-offset-4">
          Explore all software
        </LinkWrapper>
      </p>
    </section>
  );
}
