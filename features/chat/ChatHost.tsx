"use client";

import { ChatProvider } from "./ChatProvider";
import GlobalChat from "./GlobalChat";

/**
 * Mounted once in the shared app layout. Provides one conversation state
 * for the whole subtree — both the /chat page and the global popup
 * launcher — so the transcript survives navigation.
 */
export default function ChatHost({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider>
      {children}
      <GlobalChat />
    </ChatProvider>
  );
}
