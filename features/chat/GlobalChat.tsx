"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { MessageCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useChat } from "./ChatProvider";

const ChatPanelLazy = dynamic(() => import("./ChatPanel"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 flex-col gap-3" aria-label="Loading chat">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-16 w-5/6" />
      <Skeleton className="h-10 w-full" />
    </div>
  ),
});

/**
 * Persistent launcher + popup, mounted once in the shared app layout so the
 * conversation survives navigation. Hidden on /chat, which already shows
 * the full experience. Panel code is lazy-loaded: nothing beyond the
 * launcher button costs bytes or backend calls until first open.
 */
export default function GlobalChat() {
  const pathname = usePathname();
  const { popupOpen, setPopupOpen } = useChat();

  if (pathname === "/chat" || pathname?.startsWith("/chat/")) return null;

  return (
    <>
      <div className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-30">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              onClick={() => setPopupOpen(true)}
              aria-label="Open chat with Pantaleone Assistant"
              className="size-12 rounded-full shadow-lg"
            >
              <MessageCircleIcon className="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Chat with us</TooltipContent>
        </Tooltip>
      </div>

      <Sheet open={popupOpen} onOpenChange={setPopupOpen}>
        <SheetContent
          side="right"
          aria-label="Pantaleone Assistant chat"
          className="p-4 sm:top-auto sm:right-4 sm:bottom-4 sm:h-[min(680px,calc(100dvh-7rem))] sm:w-[420px] sm:max-w-[calc(100vw-2rem)] sm:rounded-xl sm:border max-sm:inset-x-0 max-sm:top-auto max-sm:right-0 max-sm:bottom-0 max-sm:left-0 max-sm:h-[92dvh] max-sm:w-full max-sm:rounded-t-2xl max-sm:border-t"
        >
          <SheetHeader className="sr-only p-0">
            <SheetTitle>Pantaleone Assistant</SheetTitle>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col">
            <ChatPanelLazy
              variant="popup"
              onNavigate={() => setPopupOpen(false)}
              onClose={() => setPopupOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
