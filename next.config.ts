import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';
const repoName = 'TORONTOEVENTS_ANTIGRAVITY';
// DEPLOY_TARGET: 'sftp' = root paths (findtorontoevents.ca/); 'github' = subdirectory (/TORONTOEVENTS_ANTIGRAVITY/)
// Default 'sftp' so plain `npm run build` is safe for FTP root; use DEPLOY_TARGET=github for subdirectory build.
const deployTarget = process.env.DEPLOY_TARGET || 'sftp';

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: (isProd && deployTarget === 'github') ? `/TORONTOEVENTS_ANTIGRAVITY` : '',
  // We do NOT need to set assetPrefix manually when using output: export and basePath.
  // Next.js automatically prefixes assets with the basePath.
  trailingSlash: true,
  distDir: 'build',
};

export default nextConfig;
