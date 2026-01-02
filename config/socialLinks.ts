import { FaStrava as StravaIcon } from "react-icons/fa";
import {
  FaEnvelope as EmailIcon,
  FaFacebook as FacebookIcon,
  FaGithub as GitHubIcon,
  FaLinkedin as LinkedInIcon,
  FaXTwitter as XPlatformIcon,
} from "react-icons/fa6";
import type { SocialLinkType } from "@/types";

const SOCIAL_LINKS: SocialLinkType[] = [
  {
    href: "mailto:mdptrading@gmail.com",
    icon: EmailIcon,
    label: "Email",
  },
  {
    href: "https://x.com/m_pantaleone",
    icon: XPlatformIcon,
    label: "X (Twitter)",
  },
  {
    href: "https://github.com/pantaleone-ai",
    icon: GitHubIcon,
    label: "GitHub",
  },
  {
    href: "https://www.linkedin.com/in/m_pantaleone/",
    icon: LinkedInIcon,
    label: "LinkedIn",
  },
  {
    href: "https://www.facebook.com/hiretimsf/",
    icon: FacebookIcon,
    label: "Facebook",
  },
  {
    href: "https://www.strava.com/athletes/128944314",
    icon: StravaIcon,
    label: "Strava",
  },
];

export default SOCIAL_LINKS;
