import Link from "next/link";
import type { ComponentProps } from "react";
import { isExternalHref, withOutboundUtm } from "@/lib/external-link";

type LinkWrapperProps = ComponentProps<typeof Link>;

/**
 * next/link wrapper that disables viewport prefetching by default.
 * Opt-in with `prefetch={true}` only for critical user journeys
 * (primary CTAs, main navigation) to avoid unnecessary Fast Origin
 * Transfer and ISR reads on every scroll.
 *
 * Outbound policy: absolute links leaving pantaleone.net open in a new
 * window (`target="_blank"` + `rel="noopener noreferrer"`) and carry a
 * `utm_source` GA can attribute. Explicit target/rel props still win.
 */
export default function LinkWrapper({
  prefetch = false,
  ...props
}: LinkWrapperProps) {
  const href = typeof props.href === "string" ? props.href : null;
  if (href && isExternalHref(href)) {
    return (
      <Link
        prefetch={false}
        {...props}
        href={withOutboundUtm(href)}
        target={props.target ?? "_blank"}
        rel={props.rel ?? "noopener noreferrer"}
      />
    );
  }
  return <Link prefetch={prefetch} {...props} />;
}
