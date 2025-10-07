
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Prevent pdfjs-dist from trying to resolve native 'canvas'
    config.externals.push({ canvas: 'canvas' });
    return config;
  },
};

export default nextConfig;

