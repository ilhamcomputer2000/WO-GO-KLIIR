import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable browser source maps to reduce memory usage
  productionBrowserSourceMaps: false,

  // Experimental memory optimizations
  experimental: {
    webpackMemoryOptimizations: true,
  },

  // Reduce devtool overhead in development
  webpack: (config, { dev }) => {
    if (dev) {
      config.devtool = "eval";
    }
    return config;
  },
};

export default nextConfig;
