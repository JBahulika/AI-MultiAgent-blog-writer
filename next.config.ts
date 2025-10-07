// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  webpack: (config) => {
    // ✅ Prevent pdfjs-dist from trying to bundle native 'canvas'
    if (!config.externals) {
      config.externals = [];
    }
    config.externals.push({ canvas: "commonjs canvas" });
    return config;
  },
};

export default nextConfig;
