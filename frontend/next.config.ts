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
    
    // Ensure path aliases work properly in all environments, including Docker
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname, "./src"),
      "@/lib": path.resolve(__dirname, "./src/lib"),
      "@/components": path.resolve(__dirname, "./src/components"),
      "@/utils": path.resolve(__dirname, "./src/utils"),
    };
    
    return config;
  },
  
  // Allow connections from Docker
  async rewrites() {
    return [];
  },
};

export default nextConfig;
