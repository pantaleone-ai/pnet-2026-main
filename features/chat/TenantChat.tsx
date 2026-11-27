"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import ChatComposer from "@/features/chat/ChatComposer";
import ChatTranscript from "@/features/chat/ChatTranscript";
import type { ChatMessage } from "@/features/chat/store";

export interface TenantPublicConfig {
  name: string;
  welcomeMessage: string | null;
  suggestedQuestions: string[];
}

interface TenantSource {
  title: string;
  url: string | null;
  excerpt: string;
}

/**
 * Standalone tenant chat (hosted page + test panel). Same SSE contract as
 * the first-party chat (sources event, deltas, [DONE]), talking to the
 * tenant endpoint. visitorId persists per chatbot in localStorage so
 * conversations resume.
 */
export default function TenantChat({
  publicId,
  config,
  endpoint,
  compact = false,
}: {
  publicId: string;
  config: TenantPublicConfig;
  /** Message endpoint; defaults to the public path. Test panel passes preview. */
  endpoint?: string;
  compact?: boolean;
}) {
  const url = endpoint ?? `/api/chat/public/${publicId}/messages`;
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      role: "assistant",
      content:
        config.welcomeMessage ||
        `Hi, I'm ${config.name}. Ask me anything about this business.`,
    },
  ]);
  const [pending, setPending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const visitorKey = `tenant-chat:visitor:${publicId}`;
  function visitorId(): string {
    try {
      const existing = window.localStorage.getItem(visitorKey);
      if (existing) return existing;
      const id = crypto.randomUUID();
      window.localStorage.setItem(visitorKey, id);
      return id;
    } catch {
      return `anon-${Date.now()}`;
    }
  }

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || pending) return;
      setPending(true);
      const userMsg: ChatMessage = { role: "user", content: trimmed };
      setMessages((m) => [...m, userMsg, { role: "assistant", content: "" }]);
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, visitorId: visitorId() }),
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) {
          throw new Error(`Request failed (${res.status})`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let acc = "";
        let sources: { title: string; type: string; url: string }[] | undefined;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const parts = buf.split("\n\n");
          buf = parts.pop() ?? "";
          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const json = JSON.parse(data) as {
                sources?: TenantSource[];
                delta?: string;
              };
              if (json.sources) {
                sources = json.sources.map((s) => ({
                  title: s.title,
                  type: "page",
                  url: s.url ?? "",
                }));
                setMessages((m) => {
                  const next = [...m];
                  const last = next[next.length - 1];
                  if (last && last.role === "assistant") {
                    next[next.length - 1] = { ...last, sources };
                  }
                  return next;
                });
              }
              if (typeof json.delta === "string") {
                acc += json.delta;
                const snapshot = acc;
                setMessages((m) => {
                  const next = [...m];
                  const last = next[next.length - 1];
                  if (last && last.role === "assistant") {
                    next[next.length - 1] = { ...last, content: snapshot, sources };
                  }
                  return next;
                });
              }
            } catch {
              // Ignore malformed chunks.
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setMessages((m) => {
            const next = [...m];
            const last = next[next.length - 1];
            if (last && last.role === "assistant" && !last.content) {
              next[next.length - 1] = {
                ...last,
                content: "Something went wrong. Please try again.",
              };
            }
            return next;
          });
        }
      } finally {
        abortRef.current = null;
        setPending(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [url, pending],
  );

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  return (
    <div className={`flex flex-col gap-3 ${compact ? "" : "min-h-[60vh]"}`}>
      {config.suggestedQuestions.length > 0 && messages.length <= 1 && (
        <div className="flex flex-wrap gap-2">
          {config.suggestedQuestions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => send(q)}
              disabled={pending}
              className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      )}
      <ChatTranscript messages={messages} streaming={pending} />
      <ChatComposer pending={pending} onSend={send} onStop={stop} />
    </div>
  );
}
