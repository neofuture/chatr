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
}

module.exports = nextConfig

