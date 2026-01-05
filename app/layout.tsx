import "@/styles/globals.css";

import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { Person, WebSite, WithContext } from "schema-dts";

import ConsentManager from "@/components/ConsentManager";
import { Providers } from "@/components/Providers";
import { SkipToMain } from "@/components/SkipToMain";

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
  authors: [{ name: "Pantaleone", url: siteConfig.links.twitter }],
  creator: "Pantaleone",

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
        url: siteConfig.ogImage,
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
    images: [siteConfig.ogImage],
    creator: "@pantaleone_ai",
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
      className={`${fontSans.variable} ${fontMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: darkModeScript }}
        />
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
      </head>
      <body suppressHydrationWarning className="min-h-screen bg-background font-sans antialiased">
        <SkipToMain />
        <Providers>
          <NuqsAdapter>
            <ConsentManager>{children}</ConsentManager>
          </NuqsAdapter>
        </Providers>

        {/* Google Analytics - Only loads when consent is given */}
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

        {/* Meta Pixel - Only loads when consent is given */}
        {analyticsConfig.metaPixel.enabled && (
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
        )}
      </body>
    </html>
  );
}
