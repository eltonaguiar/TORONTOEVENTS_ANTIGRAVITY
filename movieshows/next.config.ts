import type { NextConfig } from "next";

/** Base path for GitHub Pages (eltonaguiar.github.io/MOVIESHOWS) and FTP (findtorontoevents.ca/MOVIESHOWS) */
const basePath = "/MOVIESHOWS";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  output: "export",
  basePath,
  assetPrefix: basePath + "/",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
