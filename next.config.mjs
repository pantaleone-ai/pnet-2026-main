import { createMDX } from "fumadocs-mdx/next";

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-*', 'react-icons', 'date-fns'],
  },
  async redirects() {
    return [
      {
        source: '/blog/post/:slug*',
        destination: '/blog/:slug*',
        permanent: true, // 301 redirect
      },
      {
        source: '/about',
        destination: 'https://pantaleone.net',
        permanent: true, // 301 redirect
      },
      {
        source: '/education',
        destination: 'https://pantaleone.net',
        permanent: true, // 301 redirect
      },
      {
        source: '/experience',
        destination: 'https://pantaleone.net',
        permanent: true, // 301 redirect
      },
      // Feed redirects to RSS XML
      {
        source: '/feed',
        destination: '/rss.xml',
        permanent: true,
      },
      {
        source: '/feed/',
        destination: '/rss.xml',
        permanent: true,
      },
      // Directory redirects to homepage
      {
        source: '/digital-asset-nft-tag/:slug*',
        destination: '/',
        permanent: true,
      },
      {
        source: '/grid',
        destination: '/',
        permanent: true,
      },
      {
        source: '/sets',
        destination: '/',
        permanent: true,
      },
      {
        source: '/tag/:slug*',
        destination: '/',
        permanent: true,
      },
      {
        source: '/p/:slug*',
        destination: '/',
        permanent: true,
      },
      {
        source: '/nft-art/:slug*',
        destination: '/',
        permanent: true,
      },
      {
        source: '/product/:slug*',
        destination: '/',
        permanent: true,
      },
      {
        source: '/buy-nfts-and-custom-artwork',
        destination: '/',
        permanent: true,
      },
      {
        source: '/buy-nfts-and-custom-artwork/',
        destination: '/',
        permanent: true,
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "unavatar.io",
      },
      {
        protocol: 'https',
        hostname: 'pantaleone-net.s3.us-west-1.amazonaws.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: "https",
        hostname: "i.ebayimg.com",
      },
      {
        protocol: "https",
        hostname: "ebayimg.com",
      },
    ],
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
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' data: https://vercel.live https://*.posthog.com https://www.googletagmanager.com https://platform.twitter.com https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob: https://i.ebayimg.com https://ebayimg.com",
              "font-src 'self' data:",
              "connect-src 'self' https://*.posthog.com https://vercel.live https://*.google-analytics.com https://cdn.syndication.twimg.com https://api.github.com",
              "frame-src 'self' https://www.youtube.com https://platform.twitter.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
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
