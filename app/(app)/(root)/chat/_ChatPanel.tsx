"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BotIcon,
  MessageSquarePlusIcon,
  SendIcon,
  SquareIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import ChatMarkdown from "./_ChatMarkdown";

type Role = "user" | "assistant";
type Source = { title: string; type: string; url: string };
type ChatMessage = { role: Role; content: string; sources?: Source[] };
type StoredConversation = {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
};

const SUGGESTIONS = [
  "What services do you offer?",
  "What AI workflows have you built?",
  "How do I start a project?",
];

const SITE_URL = "https://www.pantaleone.net";
const STORAGE_KEY = "pnet-chat:v1";
const MAX_STORED_CONVERSATIONS = 20;
const MAX_STORED_MESSAGES = 60;

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hello. Ask me about the work, writing, and products on this site. I answer from published site content and say so when something is not covered.",
};

function loadConversations(): StoredConversation[] {
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

function titleFor(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  const base = (firstUser?.content ?? "New conversation").trim();
  return base.length > 48 ? `${base.slice(0, 48)}…` : base;
}

export default function ChatPanel() {
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Load persisted conversations once on mount. Resume the most recent.
  useEffect(() => {
    const stored = loadConversations();
    setConversations(stored);
    if (stored.length > 0) {
      const latest = [...stored].sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      )[0];
      if (latest && latest.messages.length > 0) {
        setActiveId(latest.id);
        setMessages(latest.messages);
      }
    }
    setHydrated(true);
  }, []);

  // Persist on every message change (skipped until hydration completes).
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    if (messages.length <= 1 && !activeId) return;
    const id =
      activeId ??
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `c-${Date.now()}`);
    if (!activeId) setActiveId(id);
    const record: StoredConversation = {
      id,
      title: titleFor(messages),
      updatedAt: new Date().toISOString(),
      messages: messages.slice(-MAX_STORED_MESSAGES),
    };
    setConversations((prev) => {
      const next = [
        record,
        ...prev.filter((c) => c.id !== id),
      ].slice(0, MAX_STORED_CONVERSATIONS);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage full or unavailable — chat still works in-memory.
      }
      return next;
    });
  }, [messages, hydrated, activeId]);

  const sortedConversations = useMemo(
    () =>
      [...conversations].sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      ),
    [conversations],
  );

  function newChat() {
    abortRef.current?.abort();
    setActiveId(null);
    setMessages([GREETING]);
    setInput("");
    setError(null);
    setIsFallback(false);
  }

  function openConversation(id: string) {
    if (pending) return;
    const found = conversations.find((c) => c.id === id);
    if (!found) return;
    setActiveId(id);
    setMessages(found.messages);
    setError(null);
    setIsFallback(false);
  }

  function deleteConversation(id: string) {
    const next = conversations.filter((c) => c.id !== id);
    setConversations(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore persistence failures.
    }
    if (id === activeId) newChat();
  }

  function stop() {
    abortRef.current?.abort();
  }

  async function send(text: string) {
    const question = text.trim();
    if (!question || pending) return;
    setError(null);
    setPending(true);

    const history = messages
      .filter((m) => m.content.trim().length > 0)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, history }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Request failed. Try again.");
      }
      setIsFallback(response.headers.get("X-Chat-Fallback") === "extractive");

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const event of events) {
          for (const line of event.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") continue;
            try {
              const json = JSON.parse(data) as {
                delta?: string;
                sources?: Source[];
              };
              if (json.sources) {
                setMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last?.role === "assistant") {
                    last.sources = json.sources;
                  }
                  return next;
                });
              }
              if (json.delta) {
                const delta = json.delta;
                setMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last?.role === "assistant") last.content += delta;
                  return next;
                });
              }
            } catch {
              // Ignore malformed stream chunks.
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // Stopped by the user; keep partial answer.
      } else {
        setError(err instanceof Error ? err.message : "Request failed.");
        setMessages((prev) =>
          prev[prev.length - 1]?.role === "assistant" &&
          prev[prev.length - 1]?.content === ""
            ? prev.slice(0, -1)
            : prev,
        );
      }
    } finally {
      setPending(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-10">
      <div className="flex items-start justify-between gap-3 text-left">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Pantaleone Chat
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Answers from published content on {SITE_URL}.{" "}
            <Link href="/contact" className="underline underline-offset-4">
              Contact
            </Link>{" "}
            for anything else.
          </p>
          {isFallback && (
            <p className="mt-2 text-xs text-muted-foreground">
              Site index mode: showing matching pages while the AI model is
              unavailable.
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={newChat}
          aria-label="Start a new conversation"
        >
          <MessageSquarePlusIcon className="size-4" />
          New
        </Button>
      </div>

      {hydrated && sortedConversations.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Past conversations">
          {sortedConversations.slice(0, 8).map((c) => (
            <span
              key={c.id}
              className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
                c.id === activeId
                  ? "border-foreground/40 text-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              <button
                type="button"
                className="max-w-44 truncate hover:underline hover:underline-offset-4"
                onClick={() => openConversation(c.id)}
                title={c.title}
              >
                {c.title}
              </button>
              <button
                type="button"
                onClick={() => deleteConversation(c.id)}
                aria-label={`Delete conversation: ${c.title}`}
                className="rounded-full p-0.5 hover:text-foreground"
              >
                <Trash2Icon className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <Card className="flex min-h-[320px] flex-col gap-3 p-4">
        <div className="flex flex-col gap-3" aria-live="polite">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <span className="mt-1 text-muted-foreground" aria-hidden="true">
                {m.role === "user" ? (
                  <UserIcon className="size-4" />
                ) : (
                  <BotIcon className="size-4" />
                )}
              </span>
              <div
                className={`max-w-[85%] rounded-lg border border-border px-3 py-2 text-left text-sm ${
                  m.role === "user" ? "bg-muted whitespace-pre-wrap" : "bg-background"
                }`}
              >
                {m.role === "assistant" ? (
                  <ChatMarkdown content={m.content} />
                ) : (
                  m.content
                )}
                {m.role === "assistant" && m.sources && m.sources.length > 0 && (
                  <div className="mt-2 border-t border-border pt-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Sources
                    </p>
                    <ul className="mt-1 flex flex-col gap-1">
                      {m.sources.map((s) => (
                        <li key={`${s.type}-${s.url}-${s.title}`}>
                          <Link
                            href={s.url.replace(SITE_URL, "") || "/"}
                            className="text-xs underline underline-offset-4"
                          >
                            {s.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <Button
              key={s}
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => send(s)}
            >
              {s}
            </Button>
          ))}
        </div>

        {error && (
          <p className="text-left text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about services, writing, or products…"
            rows={2}
            maxLength={2000}
            disabled={pending}
            aria-label="Chat message"
          />
          {pending ? (
            <Button type="button" variant="outline" onClick={stop}>
              <SquareIcon className="size-4" />
              Stop
            </Button>
          ) : (
            <Button type="submit" disabled={!input.trim()}>
              <SendIcon className="size-4" />
              Send
            </Button>
          )}
        </form>
      </Card>
    </div>
  );
}
