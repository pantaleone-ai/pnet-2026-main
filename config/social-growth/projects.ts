/**
 * GitHub Projects mapping (user-level boards under pantaleone-ai).
 * Numbers are stable project IDs; URLs are the boards.
 * CI reads numbers from PROJECT_* secrets (see social-to-projects.yml).
 * Single user: mdptrading@gmail.com via pantaleone-ai account.
 */

export const SOCIAL_PROJECTS: Record<string, { number: number; url: string; secret: string }> = {
  "synthetic-pics": {
    number: 2,
    url: "https://github.com/users/pantaleone-ai/projects/2",
    secret: "PROJECT_SYNTHETIC_PICS",
  },
  print3dmodels: {
    number: 3,
    url: "https://github.com/users/pantaleone-ai/projects/3",
    secret: "PROJECT_PRINT3DMODELS",
  },
  mixphd: {
    number: 4,
    url: "https://github.com/users/pantaleone-ai/projects/4",
    secret: "PROJECT_MIXPHD",
  },
  proswing: {
    number: 5,
    url: "https://github.com/users/pantaleone-ai/projects/5",
    secret: "PROJECT_PROSWING",
  },
  imgsquash: {
    number: 6,
    url: "https://github.com/users/pantaleone-ai/projects/6",
    secret: "PROJECT_IMGSQUASH",
  },
  aicapturelab: {
    number: 7,
    url: "https://github.com/users/pantaleone-ai/projects/7",
    secret: "PROJECT_AICAPTURELAB",
  },
  profitsignals: {
    number: 8,
    url: "https://github.com/users/pantaleone-ai/projects/8",
    secret: "PROJECT_PROFITSIGNALS",
  },
  aiceo: {
    number: 9,
    url: "https://github.com/users/pantaleone-ai/projects/9",
    secret: "PROJECT_AICEO",
  },
  pantaleone: {
    number: 10,
    url: "https://github.com/users/pantaleone-ai/projects/10",
    secret: "PROJECT_PANTALEONE",
  },
};

export function projectFor(appId: string) {
  return SOCIAL_PROJECTS[appId];
}
