import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust sample rate in production; keep at 1.0 during development.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Capture replay for sessions with errors (5 % otherwise) on the free tier.
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.05,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Silence if no DSN is configured (local dev without a Sentry project).
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
