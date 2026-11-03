import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  images: {
    // A few industry photos are served from Unsplash, as on the original site.
    remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com', pathname: '/photo-*' }],
  },
  // The old coming-soon site on the VPS published these pages; the app and store listings link to them.
  async redirects() {
    return [
      { source: '/terms.html', destination: '/terms-conditions', permanent: true },
      { source: '/privacy-policy.html', destination: '/privacy-policy', permanent: true },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
