"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { BotIcon, ChevronDownIcon, UserIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { SITE_URL, type ChatMessage } from "./store";
import ChatMarkdown from "./ChatMarkdown";

function ThinkingDots() {
  return (
    <span
      className="inline-flex items-center gap-1 py-1"
      role="status"
      aria-label="Assistant is thinking"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-muted-foreground motion-safe:animate-pulse"
          style={{ animationDelay: `${i * 200}ms` }}
        />
      ))}
    </span>
  );
}

function Sources({ message }: { message: ChatMessage }) {
  const sources = message.sources;
  if (!sources || sources.length === 0) return null;
  return (
    <details className="mt-2 border-t border-border pt-2 text-left">
      <summary className="cursor-pointer text-xs font-medium text-muted-foreground marker:text-muted-foreground hover:text-foreground">
        Sources ({sources.length})
      </summary>
      <ul className="mt-1.5 flex flex-col gap-1.5">
        {sources.map((s) => (
          <li key={`${s.type}-${s.url}-${s.title}`}>
            <Link
              href={s.url.replace(SITE_URL, "") || "/"}
              className="inline-flex items-start gap-1 text-xs text-foreground underline underline-offset-4"
            >
              <ChevronDownIcon
                className="mt-0.5 size-3 shrink-0 -rotate-90"
                aria-hidden="true"
              />
              <span>{s.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

export default function ChatTranscript({
  messages,
  streaming,
}: {
  messages: ChatMessage[];
  streaming: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    stickRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 140;
  }

  useEffect(() => {
    const el = containerRef.current;
    if (el && stickRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto"
      aria-live="polite"
      aria-label="Conversation transcript"
    >
      {messages.map((m, i) => {
        const isLast = i === messages.length - 1;
        const showThinking =
          m.role === "assistant" &&
          m.content.trim().length === 0 &&
          streaming &&
          isLast;
        return (
          <div
            key={i}
            className={cn(
              "flex gap-2",
              m.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            <span className="mt-1 shrink-0 text-muted-foreground" aria-hidden="true">
              {m.role === "user" ? (
                <UserIcon className="size-4" />
              ) : (
                <BotIcon className="size-4" />
              )}
            </span>
            <div
              className={cn(
                "max-w-[85%] rounded-lg border border-border px-3 py-2 text-left text-sm",
                m.role === "user" ? "bg-muted whitespace-pre-wrap" : "bg-background",
              )}
            >
              {m.role === "assistant" ? (
                showThinking ? (
                  <ThinkingDots />
                ) : (
                  <ChatMarkdown content={m.content} />
                )
              ) : (
                m.content
              )}
              {m.role === "assistant" && !showThinking && (
                <Sources message={m} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
