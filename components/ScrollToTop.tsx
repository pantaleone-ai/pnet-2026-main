"use client";

import { ArrowUpIcon } from "lucide-react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Positioned above the global chat launcher (same right gutter) so the two
 * never overlap. The launcher is hidden on /chat, so no lift is applied
 * there. Launcher geometry: 3rem tall at 1rem (2rem on lg) from the bottom.
 */
export function ScrollToTop({
  className,
  ...props
}: React.ComponentProps<"button">) {
  const { scrollY } = useScroll();
  const pathname = usePathname();
  const chatLauncherVisible =
    pathname !== "/chat" && !pathname?.startsWith("/chat/");

  const [visible, setVisible] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<"up" | "down">("down");

  useMotionValueEvent(scrollY, "change", (latestValue) => {
    setVisible(latestValue >= 400);

    const prev = scrollY.getPrevious() ?? 0;
    const diff = latestValue - prev;
    setScrollDirection(diff > 0 ? "down" : "up");
  });

  return (
    <Button
      data-visible={visible}
      data-scroll-direction={scrollDirection}
      className={cn(
        "[--bottom:1rem] lg:[--bottom:2rem]",
        chatLauncherVisible
          ? "bottom-[calc(var(--bottom,1rem)+3.75rem+env(safe-area-inset-bottom,0px))]"
          : "bottom-[calc(var(--bottom,1rem)+env(safe-area-inset-bottom,0px))]",
        "fixed right-4 z-50 lg:right-8",
        "transition-[background-color,opacity] duration-300 data-[scroll-direction=down]:opacity-30 data-[scroll-direction=up]:opacity-100 data-[visible=false]:opacity-0",
        "data-[scroll-direction=down]:hover:opacity-100",
        className,
      )}
      variant="secondary"
      size="icon-lg"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      {...props}
    >
      <ArrowUpIcon className="size-5" />
      <span className="sr-only">Scroll to top</span>
    </Button>
  );
}
