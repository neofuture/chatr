/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  outputFileTracingRoot: path.join(__dirname, '../'),
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../'),
  },
}

module.exports = nextConfig

