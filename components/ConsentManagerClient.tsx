"use client";

import { useEffect } from "react";

import { ClientSideOptionsProvider } from "@c15t/nextjs/client";
import { posthog } from "posthog-js";

import { setMeasurementConsent } from "@/lib/analytics";

export function ConsentManagerClient({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("pnet-measurement-consent");
      if (stored === "granted" || stored === "denied") {
        setMeasurementConsent(stored === "granted");
      }
    } catch {
      // storage unavailable — Consent Mode defaults stay denied
    }
  }, []);

  return (
    <ClientSideOptionsProvider
      callbacks={{
        onConsentSet({ preferences }) {
          const granted = preferences.measurement === true;
          setMeasurementConsent(granted);
          if (granted) {
            posthog.opt_in_capturing();
          } else {
            posthog.opt_out_capturing();
          }
        },
      }}
    >
      {children}
    </ClientSideOptionsProvider>
  );
}
