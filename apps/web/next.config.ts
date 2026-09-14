import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source; Next transpiles them.
  transpilePackages: ["@eef/core", "@eef/db", "@eef/ui-tokens"],
};

export default nextConfig;
