import { truncateDescription } from "@/lib/seo";
import type { NavigationLinkType } from "@/types";
import {
  // UserIcon as AboutMeIcon,
  RssIcon as BlogIcon,
  // GraduationCapIcon as EducationIcon,
  // FileTextIcon as ExperienceIcon,
  HomeIcon,
  ArchiveIcon as ProjectsIcon,
  // MailIcon as ContactIcon,
  ShoppingCartIcon as ShopIcon,
  BrainIcon,
  WorkflowIcon,
  StoreIcon,
  BriefcaseIcon,
  FileTextIcon,
  CalendarIcon,
} from "lucide-react";

const NAVIGATION_LINKS: NavigationLinkType[] = [
  {
    icon: HomeIcon,
    href: "/",
    label: "Home",
  },
  // {
  //   icon: AboutMeIcon,
  //   href: "/about",
  //   label: "About",
  //   subNavigationLinks: [
  //     {
  //       href: "/about",
  //       label: "About Me",
  //       description: truncateDescription("Background and skills", 30),
  //       icon: AboutMeIcon,
  //     },
  //     {
  //       href: "/experience",
  //       label: "Experience",
  //       description: truncateDescription("Background and Experience", 30),
  //       icon: ExperienceIcon,
  //     },
  //     {
  //       href: "/education",
  //       label: "Education",
  //       description: truncateDescription("Education and certifications", 30),
  //       icon: EducationIcon,
  //     },
  //   ],
  // },
  {
    icon: BriefcaseIcon,
    href: "/services",
    label: "Consulting",
    subNavigationLinks: [
      {
        href: "/services",
        label: "Services",
        description: truncateDescription("Services and pricing", 30),
        icon: BriefcaseIcon,
      },
      {
        href: "/b2b",
        label: "B2B Solutions",
        description: truncateDescription("AI work for teams", 30),
        icon: BriefcaseIcon,
      },
      {
        href: "/resources/ai-readiness-guide",
        label: "AI Readiness Guide",
        description: truncateDescription("Checklist and worksheet", 30),
        icon: FileTextIcon,
      },
      {
        href: "/contact?book=true",
        label: "Book Consultation",
        description: truncateDescription("Book a call", 30),
        icon: CalendarIcon,
      },
    ],
  },
  {
    icon: ShopIcon,
    href: "/shop",
    label: "Shop",
    subNavigationLinks: [
      {
        href: "/shop/ai-apps",
        label: "AI Apps",
        description: truncateDescription("AI Apps", 30),
        icon: BrainIcon,
      },
      {
        href: "/shop/ai-workflows",
        label: "AI & N8N Workflows",
        description: truncateDescription("AI & N8N Workflows", 30),
        icon: WorkflowIcon,
      },
      {
        href: "/shop/",
        label: "View All Products",
        description: truncateDescription("Everything for sale", 30),
        icon: StoreIcon,
      },
    ],
  },
  {
    icon: ProjectsIcon,
    href: "/projects",
    label: "Projects",
  },

  {
    icon: BlogIcon,
    href: "/blog",
    label: "Blog",
  },
  // {
  //   icon: ContactIcon,
  //   href: "/contact",
  //   label: "Contact",
  // },
];

export default NAVIGATION_LINKS;
