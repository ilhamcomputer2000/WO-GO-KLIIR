import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable browser source maps to reduce memory usage
  productionBrowserSourceMaps: false,

  // Skip TypeScript errors during build (saves memory on Vercel Hobby)
  typescript: { ignoreBuildErrors: true },

  // Experimental memory optimizations
  experimental: {
    webpackMemoryOptimizations: true,
  },

  // Turbopack config (Next.js 16 default bundler)
  turbopack: {},

  // Reduce devtool overhead in development (webpack fallback)
  webpack: (config, { dev }) => {
    if (dev) {
      config.devtool = "eval";
    }
    return config;
  },
};

export default nextConfig;
