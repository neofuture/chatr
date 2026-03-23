/** @type {import('next').NextConfig} */
const path = require('path');

// Server-side proxy always uses plain HTTP to avoid TLS cert issues
const BACKEND_PROXY_URL = 'http://localhost:3001';

const nextConfig = {
  reactStrictMode: false,
  outputFileTracingRoot: path.join(__dirname, '../'),
  devIndicators: false,
  allowedDevOrigins: ['nh07vqf32f-vmo2.local'],
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
        hostname: 'localhost',
        port: '3002',
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
      {
        source: '/widget/chatr.js',
        destination: `${BACKEND_PROXY_URL}/widget/chatr.js`,
      },
      {
        source: '/uploads/:path*',
        destination: `${BACKEND_PROXY_URL}/uploads/:path*`,
      },
    ];
  },
}

module.exports = nextConfig



