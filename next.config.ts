import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse v1 is CJS-only; prevent Next.js from bundling it so it is
  // loaded via native require() at runtime without ESM/worker issues.
  serverExternalPackages: ['pdf-parse'],

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
};

export default nextConfig;
