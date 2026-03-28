// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: "https://b8a3eaf36af7bc5be6761af838e87c60@o4511123744489472.ingest.us.sentry.io/4511123746455552",

  // Performance monitoring: sample 100% in dev, 10% in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session replay: capture 1% of sessions, 100% on error
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration(),
  ],

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // LGPD: do NOT send user PII (IP, cookies) to external servers
  sendDefaultPii: false,

  // Filter out noisy Next.js errors
  ignoreErrors: [
    "NEXT_REDIRECT",
    "NEXT_NOT_FOUND",
    "ChunkLoadError",
    "Loading chunk",
  ],
})
