"use client";

import dynamic from "next/dynamic";
import { SearchIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { Button } from "@/components/ui/button";

// The command-menu dialog (cmdk + search logic) is intentionally NOT part of
// the header's first-load bundle: it is fetched on first open intent and
// never transferred to visitors who never search.
const SearchPalette = dynamic(() => import("./SearchPalette"), {
  ssr: false,
});

function preloadPalette() {
  void import("./SearchPalette");
}

/**
 * SearchButton
 *
 * Lightweight header trigger. Owns the open state + keyboard shortcut
 * (Cmd+K / Ctrl+K / /) and mounts the heavy palette on first intent
 * (click, hover, focus, or hotkey). Call sites are unchanged.
 */
export function SearchButton() {
  const [open, setOpen] = useState(false);
  const [paletteMounted, setPaletteMounted] = useState(false);

  const requestOpen = useCallback(() => {
    setPaletteMounted(true);
    setOpen(true);
  }, []);

  // Toggle command menu with keyboard shortcuts. Mounts the palette first
  // so the shortcut works even before any pointer interaction.
  useHotkeys("mod+k, slash", (e) => {
    e.preventDefault();
    setPaletteMounted(true);
    setOpen((prevOpen) => !prevOpen);
  });

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="ghost"
        size="icon"
        aria-label="Search"
        onClick={requestOpen}
        onMouseEnter={preloadPalette}
        onFocus={preloadPalette}
        className="corner-squircle rounded-xl text-foreground "
      >
        <SearchIcon className="size-5 shrink-0 text-foreground" />
      </Button>

      {paletteMounted ? (
        <SearchPalette open={open} onOpenChange={setOpen} />
      ) : null}
    </>
  );
}

export default SearchButton;
