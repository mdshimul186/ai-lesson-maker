import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Enable hot reload in Docker
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    
    // Ensure path aliases work properly in all environments
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname, "./src"),
    };
    
    return config;
  },
  
  // Allow connections from Docker
  async rewrites() {
    return [];
  },
};

export default nextConfig;
