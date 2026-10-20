import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source; Next transpiles them.
  transpilePackages: ["@eef/core", "@eef/db", "@eef/ui-tokens"],
  // App Router skips dot-folders, so OAuth discovery for MCP clients lives under /api/well-known.
  async rewrites() {
    return [{ source: "/.well-known/:path*", destination: "/api/well-known/:path*" }];
  },
};

export default nextConfig;
