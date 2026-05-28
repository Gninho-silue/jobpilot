import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse v1 is CJS-only; prevent Next.js from bundling it so it is
  // loaded via native require() at runtime without ESM/worker issues.
  serverExternalPackages: ['pdf-parse'],
};

export default nextConfig;
