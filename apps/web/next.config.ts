import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source; Next transpiles them.
  transpilePackages: ["@eef/core", "@eef/db", "@eef/ui-tokens"],
  // App Router skips dot-folders, so OAuth discovery for MCP clients lives under /api/well-known.
  async rewrites() {
    return [{ source: "/.well-known/:path*", destination: "/api/well-known/:path*" }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

const onHttps = process.env.AUTH_URL?.startsWith("https://") ?? false;

// Lessons embed videos, documents and tools from any https site, so frame-src stays open; what
// is locked down is who may frame us, plugins, and where forms and <base> can point.
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://accounts.google.com",
      ...(onHttps ? ["upgrade-insecure-requests"] : []),
    ].join("; "),
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  ...(onHttps ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

// Source maps upload only when SENTRY_AUTH_TOKEN is set (the production build on Vercel).
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  telemetry: false,
});
