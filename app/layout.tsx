import "@/styles/globals.css";

import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { Person, WebSite, WithContext } from "schema-dts";

import ConsentManager from "@/components/ConsentManager";
import { Providers } from "@/components/Providers";
import { SkipToMain } from "@/components/SkipToMain";
import { PageTracker } from "@/hooks/usePageTracking";

// --- CHANGED: Now importing from your new unified config ---
import { siteConfig } from "@/config/site";
import { META_THEME_COLORS } from "@/config/theme"; // Assuming you kept the theme config
import { analyticsConfig } from "@/config/analytics";
import { fontMono, fontSans } from "@/lib/fonts";
// import { getBaseUrl } from "@/lib/helpers";

interface RootLayoutProps {
  children: React.ReactNode;
}

// 1. JSON-LD: Website Definition
function getWebSiteJsonLd(): WithContext<WebSite> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    author: {
      "@type": "Person",
      name: siteConfig.name,
    },
  };
}

// 2. JSON-LD: Person/Professional Definition (Updated for AI/Architecture)
function getPersonJsonLd(): WithContext<Person> {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: siteConfig.name,
    url: siteConfig.url,
    image: siteConfig.ogImage,
    jobTitle: "Senior Systems Architect",
    description: siteConfig.description,
    sameAs: [
      siteConfig.links.twitter,
      siteConfig.links.github,
      siteConfig.links.linkedin,
    ].filter(Boolean),
    knowsAbout: [
      "Next.js 16",
      "React Server Components",
      "AI Systems Architecture",
      "TypeScript",
      "Agentic Workflows",
      "System Design",
    ],
  };
}

// 3. JSON-LD: Organization + LocalBusiness (simplified for type safety)
function getOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "LocalBusiness"],
    name: "Pantaleone Digital Services LLC",
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo.png`,
    description:
      "AI engineering and automation strategy consultancy specializing in agentic AI, business automation, and enterprise AI solutions.",
    address: {
      "@type": "PostalAddress",
      addressLocality: "New York",
      addressRegion: "NY",
      addressCountry: "US",
    },
    areaServed: ["United States", "Canada", "Europe"],
    sameAs: [
      siteConfig.links.twitter,
      siteConfig.links.github,
      siteConfig.links.linkedin,
    ].filter(Boolean),
  };
}

// 4. JSON-LD: ProfessionalService (simplified for type safety)
function getProfessionalServiceJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "Pantaleone Digital Services",
    image: siteConfig.ogImage,
    priceRange: "$$$",
    description:
      "AI engineering and automation strategy services for enterprise businesses.",
  };
}

// Script to handle initial theme state (prevents flash of wrong theme)
const darkModeScript = `
  try {
    if (localStorage.theme === 'dark' || ((!('theme' in localStorage) || localStorage.theme === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.querySelector('meta[name="theme-color"]').setAttribute('content', '${META_THEME_COLORS.dark}')
    }
  } catch (_) {}
  try {
    if (/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform)) {
      document.documentElement.classList.add('os-macos')
    }
  } catch (_) {}
`;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: META_THEME_COLORS.light,
};

// 3. Metadata Configuration (Connected to siteConfig)
export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  metadataBase: new URL(siteConfig.url),
  generator: "Next.js 16",
  keywords: siteConfig.keywords,
  authors: [{ name: "Pantaleone AI", url: siteConfig.links.twitter }],
  creator: "Pantaleone AI",

  // OpenGraph
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: "/summary_large_image.png",
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },

  // Twitter
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: ["/summary_large_image.png"],
    creator: "@m_pantaleone",
  },

  // Additional meta tags
  other: {
    "og:logo": "summary_large_image.png",
  },

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      className={`dark ${fontSans.variable} ${fontMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: darkModeScript }} />
        <Script
          id="theme-script"
          strategy="beforeInteractive"
          src={`data:text/javascript;base64,${btoa(darkModeScript)}`}
        />
        {/* Inject JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(getWebSiteJsonLd()),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(getPersonJsonLd()),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(getOrganizationJsonLd()),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(getProfessionalServiceJsonLd()),
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-background font-sans antialiased"
      >
        <SkipToMain />
        <Providers>
          <NuqsAdapter>
            <ConsentManager>{children}</ConsentManager>
          </NuqsAdapter>
        </Providers>

        {/* Page tracking for SPA route changes */}
        <PageTracker />

        {/* Google Analytics - Always loads, events gated by consent */}
        {analyticsConfig.googleAnalytics.enabled && (
          <>
            <Script
              id="google-analytics"
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${analyticsConfig.googleAnalytics.id}`}
            />
            <Script
              id="google-analytics-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${analyticsConfig.googleAnalytics.id}', {
                    page_path: window.location.pathname,
                  });
                `,
              }}
            />
          </>
        )}

        {/* Meta Pixel - Always loads, events gated by consent */}
        {analyticsConfig.metaPixel.enabled && (
          <>
            <Script
              id="meta-pixel"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  !function(f,b,e,v,n,t,s)
                  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                  n.queue=[];t=b.createElement(e);t.async=!0;
                  t.src=v;s=b.getElementsByTagName(e)[0];
                  s.parentNode.insertBefore(t,s)}(window, document,'script',
                  'https://connect.facebook.net/en_US/fbevents.js');
                  fbq('init', '${analyticsConfig.metaPixel.id}');
                  fbq('track', 'PageView');
                `,
              }}
            />
            <noscript>
              <img
                height="1"
                width="1"
                style={{ display: "none" }}
                src={`https://www.facebook.com/tr?id=${analyticsConfig.metaPixel.id}&ev=PageView&noscript=1`}
                alt=""
              />
            </noscript>
          </>
        )}
      </body>
    </html>
  );
}
