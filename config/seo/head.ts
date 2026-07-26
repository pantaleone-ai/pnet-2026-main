import { truncateDescription, truncateTitle } from "@/lib/seo";
import type { HeadType } from "@/types";

const HEAD: HeadType[] = [
  {
    page: "Home",
    title: truncateTitle(
      "Pantaleone.ai | AI Systems, Automation & LLM Integration",
    ),
    description: truncateDescription(
      "We design and deploy autonomous agents, workflow automation, and AI-powered platforms for companies that need operations to scale without adding headcount.",
    ),
    slug: "/",
  },
  {
    page: "About",
    title: truncateTitle(
      "About Matt Pantaleone | AI Engineering & Automation",
    ),
    description: truncateDescription(
      "Matt Pantaleone builds autonomous agents, LLM integrations, and production automation systems for startups and enterprises.",
    ),
    slug: "/about",
  },
  {
    page: "Experience",
    title: truncateTitle("Experience | AI Engineering & Automation Work"),
    description: truncateDescription(
      "Professional history in AI systems, automation engineering, LLM integration, and full-stack development.",
    ),
    slug: "/experience",
  },
  {
    page: "Education",
    title: truncateTitle("Education | Computer Science & AI Engineering"),
    description: truncateDescription(
      "Computer science background with hands-on specialization in AI systems, LLM deployment, and production automation.",
    ),
    slug: "/education",
  },
  {
    page: "Blog",
    title: truncateTitle("Blog | AI Workflows & Automation Notes"),
    description: truncateDescription(
      "Writing on LLM implementation, agentic workflows, and building production AI systems.",
    ),
    slug: "/blog",
  },
  {
    page: "Projects",
    title: truncateTitle("Projects | AI Platforms & Automation Tools"),
    description: truncateDescription(
      "AI tools and platforms built for production: autonomous agents, LLM pipelines, and full-stack applications.",
    ),
    slug: "/projects",
  },
  {
    page: "Shop",
    title: truncateTitle("Shop | AI Workflows, Apps & Services"),
    description: truncateDescription(
      "N8N workflows, AI applications, and consulting services for teams building automation systems.",
    ),
    slug: "/shop",
  },
  {
    page: "Contact",
    title: truncateTitle("Contact | AI Engineering & Automation Consulting"),
    description: truncateDescription(
      "Hire Matt Pantaleone for AI engineering, automation strategy, and LLM integration projects.",
    ),
    slug: "/contact",
  },
  {
    page: "Privacy",
    title: truncateTitle("Privacy Policy | Pantaleone Digital Services"),
    description: truncateDescription(
      "Privacy practices and data protection policies for pantaleone.net, rapigent.com, and aiceo.io.",
    ),
    slug: "/privacy",
  },
  // {
  //   page: "Terms",
  //   title: truncateTitle("Terms of Use | Pantaleone Digital Services"),
  //   description: truncateDescription(
  //     "Legal terms and conditions for our AI-driven services, platforms, and consulting.",
  //   ),
  //   slug: "/terms",
  // },
  {
    page: "Changelog",
    title: truncateTitle("Changelog | Platform Updates & Development"),
    description: truncateDescription(
      "Development history and technical updates for the Pantaleone Digital ecosystem.",
    ),
    slug: "/changelog",
  },
];

export default HEAD;
