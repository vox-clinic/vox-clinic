// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://b8a3eaf36af7bc5be6761af838e87c60@o4511123744489472.ingest.us.sentry.io/4511123746455552",

  // Performance: 10% in production, 100% in dev
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // LGPD: do NOT send user PII (IP, cookies) to external servers
  sendDefaultPii: false,
});
