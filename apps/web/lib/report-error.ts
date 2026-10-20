import * as Sentry from "@sentry/nextjs";

/** Send an error caught by an error boundary to Sentry (a no-op when Sentry is off). */
export function reportError(error: unknown) {
  Sentry.captureException(error);
}
