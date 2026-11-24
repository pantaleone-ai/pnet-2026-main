"use client";

import Link from "next/link";
import {
  ArrowUpRightIcon,
  MessageSquarePlusIcon,
  RotateCcwIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useChat } from "./ChatProvider";
import { ASSISTANT_NAME, SITE_URL } from "./store";
import ChatComposer from "./ChatComposer";
import ChatTranscript from "./ChatTranscript";

const SUGGESTIONS = [
  "Explore Pantaleone's products.",
  "How can AI automate my business?",
  "I have an AI project to discuss.",
];

function HistoryPills() {
  const {
    hydrated,
    sortedConversations,
    activeId,
    openConversation,
    deleteConversation,
  } = useChat();
  if (!hydrated || sortedConversations.length === 0) return null;
  return (
    <div className="flex shrink-0 flex-wrap gap-1.5" aria-label="Past conversations">
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
  );
}

export default function ChatPanel({
  variant,
  onNavigate,
  onClose,
}: {
  variant: "page" | "popup";
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  const {
    messages,
    pending,
    error,
    isFallback,
    isPristine,
    send,
    stop,
    retry,
    dismissError,
    newChat,
  } = useChat();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="size-2 shrink-0 rounded-full bg-emerald-500"
            role="img"
            aria-label="Chat available"
          />
          <p className="truncate text-sm font-medium">{ASSISTANT_NAME}</p>
          <span className="shrink-0 text-xs text-muted-foreground">Online</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={newChat}
            aria-label="Start a new conversation"
          >
            <MessageSquarePlusIcon className="size-4" />
            <span className="hidden sm:inline">New</span>
          </Button>
          {variant === "popup" ? (
            <Button type="button" variant="ghost" size="sm" asChild>
              <Link
                href="/chat"
                onClick={onNavigate}
                aria-label="Open the full chat page"
              >
                <ArrowUpRightIcon className="size-4" />
                <span className="hidden sm:inline">Full page</span>
              </Link>
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="sm" asChild>
              <Link href="/contact">
                Contact
              </Link>
            </Button>
          )}
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Close chat"
            >
              <XIcon className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {variant === "page" && isPristine && (
        <div className="shrink-0 text-left">
          <h1 className="text-2xl font-semibold tracking-tight">
            What can we help you build?
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask about Pantaleone, our products, AI, or business automation.{" "}
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
      )}

      {variant === "page" && <HistoryPills />}

      <ChatTranscript messages={messages} streaming={pending} />

      <div className="flex shrink-0 flex-wrap gap-2">
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
        <div
          className="flex shrink-0 items-center gap-2 text-left text-sm"
          role="alert"
        >
          <p className="flex-1 text-destructive">{error}</p>
          <Button type="button" variant="outline" size="sm" onClick={retry}>
            <RotateCcwIcon className="size-3.5" />
            Retry
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={dismissError}
            aria-label="Dismiss error"
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      )}

      <ChatComposer pending={pending} onSend={send} onStop={stop} />
      {variant === "popup" && (
        <p className="shrink-0 text-center text-[11px] leading-none text-muted-foreground">
          Answers from {SITE_URL.replace("https://", "")}.{" "}
          <Link href="/contact" className="underline underline-offset-4">
            Contact
          </Link>{" "}
          for anything else.
        </p>
      )}
    </div>
  );
}
