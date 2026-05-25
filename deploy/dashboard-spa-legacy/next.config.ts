import { join } from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  images: { unoptimized: true },
  outputFileTracingRoot: join(__dirname),
};

export default nextConfig;
