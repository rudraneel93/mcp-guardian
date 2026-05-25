import { join } from 'path';
import type { NextConfig } from 'next';

/**
 * SOC_API_PORT / NEXT_PUBLIC_GUARDIAN_API controls where the dashboard SPA
 * fetches its live data from.
 *
 * In development (npm run dev) the Next.js server rewrites /api/* → the
 * standalone MCP Guardian SOC API server (default: http://localhost:4040).
 * This keeps the browser pointing to the same origin (no CORS hassles) while
 * the backend runs separately.
 *
 * In production (output: 'export') the static build bakes in the API base URL
 * from NEXT_PUBLIC_GUARDIAN_API.  When serving the exported files the API is
 * expected to be on the same host/port (e.g. nginx proxies /api → backend).
 */

const SOC_API_PORT = process.env['SOC_API_PORT'] ?? '4040';
const SOC_API_ORIGIN = `http://localhost:${SOC_API_PORT}`;

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  images: { unoptimized: true },
  outputFileTracingRoot: join(__dirname),

  // Static export is only for production builds.  During `next dev` we keep
  // the full Next.js server so rewrites work correctly.
  ...(isDev
    ? {
        // Dev: proxy /api/* to the Guardian SOC API backend
        async rewrites() {
          return [
            {
              source: '/api/:path*',
              destination: `${SOC_API_ORIGIN}/api/:path*`,
            },
          ];
        },
      }
    : {
        output: 'export',
      }),
};

export default nextConfig;
