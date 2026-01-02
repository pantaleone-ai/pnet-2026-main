import { getBaseUrl } from "@/lib/helpers";

export const SITE_INFO = {
  name: "Pantaleone.net",
  url: getBaseUrl(),
  alternateName: "Pantaleone.net",
};

// GitHub repository information
export const GITHUB_REPO_OWNER = "pantaleone-ai";
export const GITHUB_REPO_NAME = "pnet-2026-main";
export const SOURCE_CODE_GITHUB_REPO = `${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`;
export const SOURCE_CODE_GITHUB_URL = `https://github.com/${SOURCE_CODE_GITHUB_REPO}`;
