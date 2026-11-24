import type { Metadata } from "next";
import ChatPanel from "@/features/chat/ChatPanel";

export const metadata: Metadata = {
  title: {
    absolute: "Pantaleone Assistant | Pantaleone",
  },
  description:
    "Ask about Pantaleone, our products, AI, or business automation. Answers come from published content on https://www.pantaleone.net.",
  alternates: {
    canonical: "https://www.pantaleone.net/chat",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ChatPage() {
  return (
    <div className="mx-auto flex w-full max-w-[800px] flex-col px-4 py-10">
      <div className="flex min-h-[70dvh] flex-col rounded-xl border border-border bg-card p-4">
        <ChatPanel variant="page" />
      </div>
    </div>
  );
}
