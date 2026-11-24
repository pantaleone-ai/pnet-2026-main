"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
 * Desktop-first breakpoint match. Defaults to false (modal) until hydration
 * so server HTML matches the first client paint.
 */
function useDesktopBreakpoint(): boolean {
  const [isDesktop, setIsDesktop] = useState<boolean>(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 640px)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(min-width: 640px)");
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
}

/**
 * Persistent launcher + popup, mounted once in the shared app layout so the
 * conversation survives navigation. Hidden on /chat, which already shows
 * the full experience. Panel code is lazy-loaded: nothing beyond the
 * launcher button costs bytes or backend calls until first open.
 *
 * Desktop: modeless side panel — the page stays clickable, scrollable, and
 * readable while chatting. Mobile: modal bottom sheet (a modeless sheet
 * would fight the virtual keyboard and page scroll).
 */
export default function GlobalChat() {
  const pathname = usePathname();
  const { popupOpen, setPopupOpen } = useChat();
  const isDesktop = useDesktopBreakpoint();

  if (pathname === "/chat" || pathname?.startsWith("/chat/")) return null;

  return (
    <>
      <div className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 lg:right-[max(2rem,env(safe-area-inset-right))]">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              onClick={() => setPopupOpen(!popupOpen)}
              aria-label={
                popupOpen
                  ? "Close chat with Pantaleone Assistant"
                  : "Open chat with Pantaleone Assistant"
              }
              aria-expanded={popupOpen}
              className="size-12 rounded-full shadow-lg"
            >
              <MessageCircleIcon className="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Chat with us</TooltipContent>
        </Tooltip>
      </div>

      <Sheet open={popupOpen} onOpenChange={setPopupOpen} modal={!isDesktop}>
        <SheetContent
          side="right"
          hideOverlay={isDesktop}
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
