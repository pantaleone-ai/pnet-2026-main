"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { memo } from "react";

// Logo component with avatar and brand name
const LogoButton = memo(({ className }: { className?: string }) => {
  return (
    <Link
      className={cn("group flex items-center gap-2", className)}
      href="/"
      aria-label="Go to homepage"
    >
      <div className="relative size-6 shrink-0">
        <Image
          src="/images/p-icon-light.svg"
          alt="Pantaleone logo"
          className="size-full object-contain dark:hidden"
          width={48}
          height={48}
          priority
        />
        <Image
          src="/images/p-icon-dark.svg"
          alt=""
          aria-hidden
          className="hidden size-full object-contain dark:block"
          width={48}
          height={48}
          priority
        />
      </div>
      <span className="tracking-tight text-foreground group-hover:text-foreground/90 text-xl font-medium group-hover:underline group-hover:underline-offset-4 md:text-lg">
        Pantaleone
      </span>
    </Link>
  );
});

LogoButton.displayName = "LogoButton";

export default LogoButton;
