"use client";

import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

/**
 * Brand P-mark for chat surfaces. The glyph must contrast the surface it
 * sits on, which is opposite surfaces in the two placements:
 * - Launcher button: dark in light mode, light in dark mode → pass
 *   `inverted` (white glyph when the page is light).
 * - Transcript avatar: sits on the panel background, so it follows the
 *   page theme (black glyph when the page is light).
 *
 * File names refer to the button context, not the page: p-icon-dark.svg
 * is the WHITE glyph, p-icon-light.svg is the BLACK glyph.
 *
 * Follows the next-themes site theme. Before hydration resolvedTheme is
 * undefined on both server and first client paint, so both render the
 * dark-mode asset — no hydration mismatch.
 */
const WHITE_GLYPH = "https://www.pantaleone.net/images/p-icon-dark.svg";
const BLACK_GLYPH = "https://www.pantaleone.net/images/p-icon-light.svg";

export default function ChatBrandIcon({
  className,
  inverted = false,
}: {
  className?: string;
  /** Set for dark surfaces in light mode (e.g. the primary launcher button). */
  inverted?: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const useWhiteGlyph = inverted ? isLight : !isLight;
  const src = useWhiteGlyph ? WHITE_GLYPH : BLACK_GLYPH;
  return (
    // Plain img (not next/image): tiny same-origin SVGs, no optimizer config needed.
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className={cn("size-4", className)}
      draggable={false}
    />
  );
}
