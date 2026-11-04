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
  // Addresses from the old sites (the coming-soon pages on the VPS and the earlier CodeIgniter site),
  // which the app, store listings and payment gateways may still link to.
  async redirects() {
    return [
      { source: '/terms.html', destination: '/terms-conditions', permanent: true },
      { source: '/privacy-policy.html', destination: '/privacy-policy', permanent: true },
      { source: '/contact.html', destination: '/contact-us', permanent: true },
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/home', destination: '/', permanent: true },
      { source: '/index.php', destination: '/', permanent: true },
      { source: '/index.php/:path*', destination: '/:path*', permanent: true },
      // Policy pages under other common names, and one policy linked relative to another
      // (e.g. /privacy-policy/shipping-policy).
      { source: '/:from(privacy-policy|terms-conditions|refund-policy|shipping-policy|delete-account)/:page(privacy-policy|terms-conditions|refund-policy|shipping-policy|delete-account)', destination: '/:page', permanent: true },
      { source: '/:page(privacy|privacy-statement)', destination: '/privacy-policy', permanent: true },
      { source: '/:page(terms|terms-and-conditions|terms-of-service|terms-of-use)', destination: '/terms-conditions', permanent: true },
      { source: '/:page(refund|refunds|refund-and-cancellation-policy|cancellation-policy|cancellation-and-refund-policy|return-policy)', destination: '/refund-policy', permanent: true },
      { source: '/:page(shopping-policy|shipping|delivery-policy|shipping-and-delivery-policy)', destination: '/shipping-policy', permanent: true },
      { source: '/:page(account-deletion|delete-my-account|data-deletion)', destination: '/delete-account', permanent: true },
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
