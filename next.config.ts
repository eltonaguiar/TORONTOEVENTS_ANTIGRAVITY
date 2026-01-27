import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';
const repoName = 'TORONTOEVENTS_ANTIGRAVITY';
// Allow override via DEPLOY_TARGET env var: 'sftp' = root path, 'github' = subdirectory
const deployTarget = process.env.DEPLOY_TARGET || 'github';

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // GitHub Pages hosting configuration
  // When deploying to a subdirectory (like a GitHub repo page), set the basePath.
  // For SFTP deployment to root, use DEPLOY_TARGET=sftp
  basePath: (isProd && deployTarget === 'github') ? `/TORONTOEVENTS_ANTIGRAVITY` : '',
  // We do NOT need to set assetPrefix manually when using output: export and basePath.
  // Next.js automatically prefixes assets with the basePath.
  trailingSlash: true,
  distDir: 'build',
};

export default nextConfig;
