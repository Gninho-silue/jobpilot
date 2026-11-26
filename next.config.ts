import type { NextConfig } from "next";
import { assertProductionAppUrl } from "./src/lib/env";
import { assertNoFakeLlmInProduction } from "./src/lib/ai/fake-llm-guard";

// Fails a production build whose public URL is missing, http:// or localhost.
assertProductionAppUrl();
// Fails a production build that could answer with the end-to-end tests' fake model.
assertNoFakeLlmInProduction();

const nextConfig: NextConfig = {
  // The dev-only "N" badge covered the bottom of the sidebar in screenshots.
  devIndicators: false,

  // Pin the Turbopack root to this project. Without this, Turbopack's
  // automatic root detection walks up the filesystem for a lockfile and
  // picks up C:\Users\<user>\package-lock.json, which breaks resolution
  // of the `next` package (intermittent "Next.js package not found" panics).
  turbopack: {
    root: __dirname,
  },

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
