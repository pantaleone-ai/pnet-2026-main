"use client";

import { useEffect, useRef, useState } from "react";
import { SendIcon, SquareIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const MAX_COMPOSER_HEIGHT = 160;

export default function ChatComposer({
  pending,
  onSend,
  onStop,
  autoFocus = false,
}: {
  pending: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  autoFocus?: boolean;
}) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function autoresize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_COMPOSER_HEIGHT)}px`;
  }

  useEffect(() => {
    autoresize();
  }, [input]);

  function submit() {
    if (!input.trim() || pending) return;
    onSend(input);
    setInput("");
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) el.style.height = "auto";
    });
  }

  return (
    <form
      className="flex shrink-0 items-end gap-2 pb-[env(safe-area-inset-bottom)]"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Ask about services, products, or AI…"
        rows={1}
        maxLength={2000}
        disabled={pending}
        autoFocus={autoFocus}
        aria-label="Chat message"
        enterKeyHint="send"
        className={cn("max-h-40 min-h-9 resize-none")}
      />
      {pending ? (
        <Button
          type="button"
          variant="outline"
          onClick={onStop}
          aria-label="Stop generating"
          className="shrink-0"
        >
          <SquareIcon className="size-4" />
          <span className="sr-only sm:not-sr-only">Stop</span>
        </Button>
      ) : (
        <Button
          type="submit"
          disabled={!input.trim()}
          aria-label="Send message"
          className="shrink-0"
        >
          <SendIcon className="size-4" />
          <span className="sr-only sm:not-sr-only">Send</span>
        </Button>
      )}
    </form>
  );
}
