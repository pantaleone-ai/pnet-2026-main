import type { User } from "@/types";

export const USER: User = {
  firstName: "Matt",
  lastName: "Pantaleone",
  displayName: "Matt Pantaleone",
  username: "pantaleone",
  gender: "male",
  pronouns: "he/him",
  bio: "Founder of Pantaleone Digital Services LLC, specializing in AI-driven tools, consulting, and high-scale digital solutions.",
  flipSentences: [
    "Digital Solutions Architect",
    "AI-Driven Tool Developer",
    "Technical Consulting Expert",
    "Founder of Pantaleone Digital Services",
  ],
  address: "United States", 
  phoneNumber: "", // E.164 format, base64 encoded
  email: "mdptrading@gmail.com",
  website: "https://pantaleone.net",
  jobTitle: "Founder & Lead Developer",
  jobs: [
    {
      title: "Founder",
      company: "Pantaleone Digital Services LLC",
      website: "https://pantaleone.net",
    },
    {
      title: "Lead Strategist",
      company: "Rapigent",
      website: "https://rapigent.com",
    },
    {
      title: "Technical Lead",
      company: "AICEO",
      website: "https://aiceo.io",
    },
  ],
  about: `
Hello! I am Matt Pantaleone, the founder of Pantaleone Digital Services LLC. 

I specialize in providing a comprehensive range of digital solutions, including AI-driven software, professional consulting, and innovative online platforms like Rapigent and AICEO. My work focuses on building scalable, secure, and high-performance technology that drives business growth.

Whether you are looking for advanced AI implementation or strategic digital consulting, I am dedicated to delivering excellence in every project.
`,
  avatar: "/images/horizontal-profile.jpg",
  ogImage: "/images/open-graph-image.jpg",
  namePronunciationUrl: "",
  timeZone: "America/New_York",
  keywords: [
    "Matt Pantaleone",
    "Pantaleone Digital Services LLC",
    "AI-driven tools",
    "digital consulting services",
    "Rapigent",
    "AICEO",
    "software engineering",
    "artificial intelligence consultant",
    "scalable web applications",
    "tech entrepreneur",
    "pantaleone.net",
    "digital solutions architect",
    "machine learning implementation",
    "business automation",
    "next.js",
    "typescript",
    "AI platform development",
  ],
  dateCreated: "2025-01-01", // Updated to match document effective dates
};