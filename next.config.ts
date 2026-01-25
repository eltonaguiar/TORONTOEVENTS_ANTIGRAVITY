import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: '/TORONTOEVENTS_ANTIGRAVITY',
  /* config options here */
};

export default nextConfig;
