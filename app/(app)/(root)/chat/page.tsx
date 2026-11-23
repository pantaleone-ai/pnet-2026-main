import type { Metadata } from "next";
import ChatPanel from "./_ChatPanel";

export const metadata: Metadata = {
  title: {
    absolute: "Pantaleone Chat | Pantaleone",
  },
  description:
    "Ask about the work, writing, and products on https://www.pantaleone.net. Answers come from published site content.",
  alternates: {
    canonical: "https://www.pantaleone.net/chat",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ChatPage() {
  return <ChatPanel />;
}
