import Link from "next/link";
import type { ComponentProps } from "react";

type LinkWrapperProps = ComponentProps<typeof Link>;

/**
 * next/link wrapper that disables viewport prefetching by default.
 * Opt-in with `prefetch={true}` only for critical user journeys
 * (primary CTAs, main navigation) to avoid unnecessary Fast Origin
 * Transfer and ISR reads on every scroll.
 */
export default function LinkWrapper({
  prefetch = false,
  ...props
}: LinkWrapperProps) {
  return <Link prefetch={prefetch} {...props} />;
}
