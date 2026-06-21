import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable browser source maps to reduce memory usage
  productionBrowserSourceMaps: false,

  // Skip lint & type-check during build (saves memory on Vercel Hobby)
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

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
