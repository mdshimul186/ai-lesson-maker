import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable hot reload in Docker
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
  
  // Allow connections from Docker and external IPs
  async rewrites() {
    return [];
  },
  
  // Ensure the app can be accessed from external IPs
  experimental: {
    // This helps with Docker deployments
  },
};

export default nextConfig;
