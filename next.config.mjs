import { createMDX } from "fumadocs-mdx/next";

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-*",
      "react-icons",
      "date-fns",
    ],
  },
  async redirects() {
    return [
      {
        source: "/blog/post/:slug*",
        destination: "/blog/:slug*",
        permanent: true, // 301 redirect
      },
      {
        source: "/about",
        destination: "https://pantaleone.net",
        permanent: true, // 301 redirect
      },
      {
        source: "/education",
        destination: "https://pantaleone.net",
        permanent: true, // 301 redirect
      },
      {
        source: "/experience",
        destination: "https://pantaleone.net",
        permanent: true, // 301 redirect
      },
      // Feed redirects to RSS XML
      {
        source: "/feed",
        destination: "/rss.xml",
        permanent: true,
      },
      {
        source: "/feed/",
        destination: "/rss.xml",
        permanent: true,
      },
      // Directory redirects to homepage
      {
        source: "/digital-asset-nft-tag/:slug*",
        destination: "/",
        permanent: true,
      },
      {
        source: "/grid",
        destination: "/",
        permanent: true,
      },
      {
        source: "/sets",
        destination: "/",
        permanent: true,
      },
      {
        source: "/tag/:slug*",
        destination: "/",
        permanent: true,
      },
      {
        source: "/p/:slug*",
        destination: "/",
        permanent: true,
      },
      {
        source: "/nft-art/:slug*",
        destination: "/",
        permanent: true,
      },
      {
        source: "/product/:slug*",
        destination: "/",
        permanent: true,
      },
      {
        source: "/buy-nfts-and-custom-artwork",
        destination: "/",
        permanent: true,
      },
      {
        source: "/buy-nfts-and-custom-artwork/",
        destination: "/",
        permanent: true,
      },
    ];
  },
  images: {
    loader: "default", // Prevents Vercel's optimization
    unoptimized: true, // Disables all image optimizations globally
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' data: https://vercel.live https://*.posthog.com https://www.googletagmanager.com https://platform.twitter.com https://va.vercel-scripts.com https://connect.facebook.net",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob: https://i.ebayimg.com https://ebayimg.com https://www.facebook.com",
              "font-src 'self' data:",
              "connect-src 'self' https://*.posthog.com https://vercel.live https://*.google-analytics.com https://*.googleadservices.com https://*.doubleclick.net https://cdn.syndication.twimg.com https://api.github.com https://www.facebook.com https://graph.facebook.com https://*.an.facebook.com",
              "frame-src 'self' https://www.youtube.com https://platform.twitter.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
      {
        // Block indexing of _next static files
        source: "/_next/static/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Block indexing of all _next paths (static, data, chunks, etc.)
        source: "/_next/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow",
          },
        ],
      },
      {
        // Block indexing of URLs with dpl query params (Vercel cache busting)
        source: "/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex",
          },
        ],
        has: [
          {
            key: "dpl",
            type: "query",
          },
        ],
      },
      {
        // Block indexing of _vercel files
        source: "/_vercel/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex",
          },
        ],
      },
    ];
  },
};
const withMDX = createMDX({
  // customise the config file path
  // configPath: "source.config.ts"
});
export default withMDX(config);
