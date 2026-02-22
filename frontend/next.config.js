/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Fix workspace hoisting: tell Next.js this is the root for module tracing
  outputFileTracingRoot: path.join(__dirname, '../'),
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../'),
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // mermaid uses browser-only APIs — exclude from server bundle entirely
      config.externals = [...(config.externals || []), 'mermaid'];
    }
    return config;
  },
}

module.exports = nextConfig

