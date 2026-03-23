/** @type {import('next').NextConfig} */
const path = require('path');

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const nextConfig = {
  reactStrictMode: false,
  outputFileTracingRoot: path.join(__dirname, '../'),
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
        pathname: '/**',
      },
    ],
    unoptimized: process.env.NODE_ENV === 'production',
  },
  async headers() {
    return [
      {
        source: '/widget/chatr.js',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      // Proxy the widget JS from the backend so localhost:3000/widget/chatr.js works
      {
        source: '/widget/chatr.js',
        destination: `${BACKEND_URL}/widget/chatr.js`,
      },
    ];
  },
}

module.exports = nextConfig



