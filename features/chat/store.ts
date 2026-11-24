export type Role = "user" | "assistant";

export type Source = { title: string; type: string; url: string };

export type ChatMessage = {
  role: Role;
  content: string;
  sources?: Source[];
};

export type StoredConversation = {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
};

export const SITE_URL = "https://www.pantaleone.net";
export const ASSISTANT_NAME = "Pantaleone Assistant";

const STORAGE_KEY = "pnet-chat:v1";
const ACTIVE_ID_KEY = "pnet-chat:active-id";
const OPEN_KEY = "pnet-chat:open";
export const MAX_STORED_CONVERSATIONS = 20;
export const MAX_STORED_MESSAGES = 60;

export const DEFAULT_SUGGESTIONS = [
  "Explore Pantaleone's products.",
  "How can AI automate my business?",
  "I have an AI project to discuss.",
];

const SUGGESTION_SETS: { match: RegExp; suggestions: string[] }[] = [
  {
    match: /^\/shop/,
    suggestions: [
      "What AI products do you sell?",
      "Which product fits a small team?",
      "Do you help with product setup?",
    ],
  },
  {
    match: /^\/blog/,
    suggestions: [
      "What have you written about AI agents?",
      "Summarize the latest posts.",
      "How do I apply what the blog describes?",
    ],
  },
  {
    match: /^\/(services|b2b|contact)/,
    suggestions: [
      "What services do you offer?",
      "How do we start a project?",
      "Do you work with small teams?",
    ],
  },
  {
    match: /^\/apps/,
    suggestions: [
      "What apps have you built?",
      "Can you build something like this for me?",
      "How can AI automate my business?",
    ],
  },
];

/**
 * Page-aware suggestion chips. The popup inherits the page it was opened
 * on; /chat always gets the general set. No tracking, no backend — purely
 * the current pathname.
 */
export function suggestionsFor(pathname: string | null | undefined): string[] {
  if (!pathname) return DEFAULT_SUGGESTIONS;
  return (
    SUGGESTION_SETS.find((s) => s.match.test(pathname))?.suggestions ??
    DEFAULT_SUGGESTIONS
  );
}

export const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hello. Ask about Pantaleone, our products, AI, or business automation. I answer from published site content and say so when something is not covered.",
};

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `c-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function newConversationId(): string {
  return makeId();
}

export function titleFor(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  const base = (firstUser?.content ?? "New conversation").trim();
  return base.length > 48 ? `${base.slice(0, 48)}…` : base;
}

export function loadConversations(): StoredConversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredConversation[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((c) => c && typeof c.id === "string" && Array.isArray(c.messages))
      .slice(0, MAX_STORED_CONVERSATIONS);
  } catch {
    return [];
  }
}

export function saveConversations(conversations: StoredConversation[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(conversations.slice(0, MAX_STORED_CONVERSATIONS)),
    );
  } catch {
    // Storage full or unavailable — chat still works in-memory.
  }
}

export function loadActiveId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_ID_KEY);
  } catch {
    return null;
  }
}

export function saveActiveId(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(ACTIVE_ID_KEY, id);
    else window.localStorage.removeItem(ACTIVE_ID_KEY);
  } catch {
    // Ignore persistence failures.
  }
}

/**
 * Popup open state lives in sessionStorage (per-tab): a reload restores
 * the chat UI exactly as the visitor left it, but a fresh tab never
 * auto-opens the popup uninvited.
 */
export function loadPopupOpen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(OPEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function savePopupOpen(open: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(OPEN_KEY, open ? "1" : "0");
  } catch {
    // Ignore persistence failures.
  }
}
