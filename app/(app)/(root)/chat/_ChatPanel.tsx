"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { BotIcon, SendIcon, SquareIcon, UserIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type Role = "user" | "assistant";
type Source = { title: string; type: string; url: string };
type ChatMessage = { role: Role; content: string; sources?: Source[] };

const SUGGESTIONS = [
  "What services do you offer?",
  "What AI workflows have you built?",
  "How do I start a project?",
];

const SITE_URL = "https://www.pantaleone.net";

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello. Ask me about the work, writing, and products on this site. I answer from published site content and say so when something is not covered.",
    },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  function stop() {
    abortRef.current?.abort();
  }

  async function send(text: string) {
    const question = text.trim();
    if (!question || pending) return;
    setError(null);
    setPending(true);

    const history = messages
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
      <div className="text-left">
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
                className={`max-w-[85%] rounded-lg border border-border px-3 py-2 text-left text-sm whitespace-pre-wrap ${
                  m.role === "user" ? "bg-muted" : "bg-background"
                }`}
              >
                {m.content}
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
