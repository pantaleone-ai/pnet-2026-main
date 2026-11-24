"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  GREETING,
  MAX_STORED_CONVERSATIONS,
  MAX_STORED_MESSAGES,
  loadActiveId,
  loadConversations,
  newConversationId,
  saveActiveId,
  saveConversations,
  titleFor,
  type ChatMessage,
  type Source,
  type StoredConversation,
} from "./store";

type HistoryItem = { role: "user" | "assistant"; content: string };

type ChatContextValue = {
  messages: ChatMessage[];
  conversations: StoredConversation[];
  sortedConversations: StoredConversation[];
  activeId: string | null;
  pending: boolean;
  error: string | null;
  isFallback: boolean;
  hydrated: boolean;
  popupOpen: boolean;
  isPristine: boolean;
  setPopupOpen: (open: boolean) => void;
  send: (text: string) => Promise<void>;
  stop: () => void;
  retry: () => Promise<void>;
  dismissError: () => void;
  newChat: () => void;
  openConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Load persisted state once on mount. Resume the active conversation,
  // falling back to the most recent one.
  useEffect(() => {
    const stored = loadConversations();
    setConversations(stored);
    const savedId = loadActiveId();
    const target =
      stored.find((c) => c.id === savedId) ??
      [...stored].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    if (target && target.messages.length > 0) {
      setActiveId(target.id);
      setMessages(target.messages);
      saveActiveId(target.id);
    }
    setHydrated(true);
  }, []);

  // Persist on every message change (skipped until hydration completes).
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    if (messages.length <= 1 && !activeId) return;
    const id = activeId ?? newConversationId();
    if (!activeId) {
      setActiveId(id);
      saveActiveId(id);
    }
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
      saveConversations(next);
      return next;
    });
  }, [messages, hydrated, activeId]);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || abortRef.current) return;
      setError(null);
      setFailedMessage(null);
      setPending(true);

      const history: HistoryItem[] = messages
        .filter((m) => m.content.trim().length > 0)
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));
      setMessages((prev) => [...prev, { role: "user", content: question }]);

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
          setFailedMessage(question);
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
    },
    [messages],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const retry = useCallback(async () => {
    if (failedMessage) {
      setError(null);
      setFailedMessage(null);
      await send(failedMessage);
    }
  }, [failedMessage, send]);

  const dismissError = useCallback(() => {
    setError(null);
    setFailedMessage(null);
  }, []);

  const newChat = useCallback(() => {
    abortRef.current?.abort();
    const id: string | null = null;
    setActiveId(id);
    saveActiveId(id);
    setMessages([GREETING]);
    setError(null);
    setFailedMessage(null);
    setIsFallback(false);
  }, []);

  const openConversation = useCallback(
    (id: string) => {
      if (abortRef.current) return;
      const found = conversations.find((c) => c.id === id);
      if (!found) return;
      setActiveId(id);
      saveActiveId(id);
      setMessages(found.messages);
      setError(null);
      setFailedMessage(null);
      setIsFallback(false);
    },
    [conversations],
  );

  const deleteConversation = useCallback(
    (id: string) => {
      const next = conversations.filter((c) => c.id !== id);
      setConversations(next);
      saveConversations(next);
      if (id === activeId) {
        setActiveId(null);
        saveActiveId(null);
        setMessages([GREETING]);
        setError(null);
        setFailedMessage(null);
      }
    },
    [conversations, activeId],
  );

  const sortedConversations = useMemo(
    () =>
      [...conversations].sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      ),
    [conversations],
  );

  const isPristine = useMemo(
    () => !messages.some((m) => m.role === "user"),
    [messages],
  );

  const value = useMemo<ChatContextValue>(
    () => ({
      messages,
      conversations,
      sortedConversations,
      activeId,
      pending,
      error,
      isFallback,
      hydrated,
      popupOpen,
      isPristine,
      setPopupOpen,
      send,
      stop,
      retry,
      dismissError,
      newChat,
      openConversation,
      deleteConversation,
    }),
    [
      messages,
      conversations,
      sortedConversations,
      activeId,
      pending,
      error,
      isFallback,
      hydrated,
      popupOpen,
      isPristine,
      send,
      stop,
      retry,
      dismissError,
      newChat,
      openConversation,
      deleteConversation,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
