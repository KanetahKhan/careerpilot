import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse and mammoth are server-only; keep them out of the client bundle.
  serverExternalPackages: ["pdf-parse", "mammoth"],
};

export default withSentryConfig(nextConfig, {
  // Suppress noisy build output when SENTRY_AUTH_TOKEN is not set (local dev / CI).
  silent: !process.env.SENTRY_AUTH_TOKEN,

  // Disable source-map upload when the auth token is absent — avoids a build error.
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },

  // Tree-shake Sentry logger from the client bundle in production.
  disableLogger: true,

  // Auto-instrument Next.js server components and route handlers.
  autoInstrumentServerFunctions: true,
});
