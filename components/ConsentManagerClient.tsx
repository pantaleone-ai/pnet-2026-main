"use client";

import { ClientSideOptionsProvider } from "@c15t/nextjs/client";
import { posthog } from "posthog-js";

import { setMeasurementConsent } from "@/lib/analytics";

function syncVendorsFromPreferences(
  preferences: Record<string, boolean>,
): void {
  const granted = preferences.measurement === true;
  // c15t is the source of truth. setMeasurementConsent persists a
  // write-through cache (pnet-measurement-consent) for the layout-head
  // Consent Mode bootstrap + hasMeasurementConsent() fast path, and pushes
  // the gtag consent update. onConsentSet replays on store init, so
  // return visitors are restored from the c15t store — no localStorage
  // read here, which previously diverged from c15t and stuck return
  // visitors at denied.
  setMeasurementConsent(granted);
  if (granted) {
    posthog.opt_in_capturing();
  } else {
    posthog.opt_out_capturing();
  }
}

export function ConsentManagerClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientSideOptionsProvider
      callbacks={{
        onConsentSet({ preferences }) {
          syncVendorsFromPreferences(preferences);
        },
      }}
    >
      {children}
    </ClientSideOptionsProvider>
  );
}
