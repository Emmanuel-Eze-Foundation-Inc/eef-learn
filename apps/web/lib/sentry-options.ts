import type { ErrorEvent } from "@sentry/nextjs";

/** Shared Sentry settings for the browser, Node and edge runtimes. Off unless a DSN is set. */
export const sentryOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  // Learners' emails, IPs and cookies stay out of error reports.
  sendDefaultPii: false,
  // Request bodies can hold a model key or password (settings, sign-in): never send them.
  beforeSend(event: ErrorEvent) {
    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
    }
    return event;
  },
};
