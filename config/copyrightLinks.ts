import type { LinkItem } from "@/types";
import { CopyrightIcon, FileTextIcon, LockIcon } from "lucide-react";

export const COPYRIGHT_LINKS = {
  privacy: {
    href: "/privacy",
    icon: LockIcon,
    label: "Privacy Policy",
    ariaLabel: "View privacy policy",
  },
  copyright: {
    icon: CopyrightIcon,
    label: `${new Date().getFullYear()} - Pantaleone.net - All rights reserved.`,
    ariaLabel: "View copyright information",
  },
  terms: {
    href: "/changelog",
    icon: FileTextIcon,
    label: "Terms of Use",
    ariaLabel: "View terms of use",
  },
} satisfies Record<string, LinkItem>;
