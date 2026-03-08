/** @type {import('next').NextConfig} */
const path = require('path');

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const nextConfig = {
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  outputFileTracingRoot: path.join(__dirname, '../'),
  devIndicators: false,
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



