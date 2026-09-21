import LinkWrapper from "@/components/LinkWrapper";
import { ECOSYSTEM_GROUPS } from "@/config/ecosystem";
import { cn } from "@/lib/utils";

type DirectoryLink = {
  label: string;
  href: string;
  external?: boolean;
};

type DirectoryGroup = {
  heading: string;
  links: DirectoryLink[];
};

const PANTALEONE_GROUP: DirectoryGroup = {
  heading: "Pantaleone",
  links: [
    { label: "Services", href: "/services" },
    { label: "B2B Solutions", href: "/b2b" },
    { label: "Projects", href: "/projects" },
    { label: "AI Apps", href: "/shop/ai-apps" },
    { label: "AI Workflows", href: "/shop/ai-workflows" },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/contact" },
  ],
};

const GROUPS: DirectoryGroup[] = [
  PANTALEONE_GROUP,
  ...ECOSYSTEM_GROUPS.map((group) => ({
    heading: group.heading,
    links: group.links.map((link) => ({
      label: link.label,
      href: link.href,
      external: true,
    })),
  })),
];

function GroupBlock({ group }: { group: DirectoryGroup }) {
  return (
    <section aria-labelledby={`footer-${group.heading}`}>
      <h3
        id={`footer-${group.heading}`}
        className="text-sm font-semibold text-foreground"
      >
        {group.heading}
      </h3>
      <ul className="mt-3 space-y-2.5">
        {group.links.map((link) => (
          <li key={link.href}>
            <LinkWrapper
              href={link.href}
              prefetch={false}
              className={cn(
                "text-sm font-normal text-foreground/80 transition-colors duration-200 hover:text-muted-foreground",
                "rounded-sm underline-offset-4 hover:underline",
                "focus-visible:outline-2 focus-visible:outline-ring",
              )}
            >
              {link.label}
            </LinkWrapper>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function FooterDirectory() {
  return (
    <nav
      aria-label="Pantaleone ecosystem"
      className="mx-auto w-full max-w-5xl border-x border-edge"
    >
      {/* Desktop: 4-column directory */}
      <div className="hidden gap-8 px-4 py-10 md:grid md:grid-cols-4">
        {GROUPS.map((group) => (
          <GroupBlock key={group.heading} group={group} />
        ))}
      </div>
      {/* Mobile: compact stacked sections (server-rendered, no JS) */}
      <div className="grid grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-2 md:hidden">
        {GROUPS.map((group) => (
          <GroupBlock key={group.heading} group={group} />
        ))}
      </div>
    </nav>
  );
}
