/**
 * PM2 Ecosystem Config — used on the AWS EC2 deployment.
 *
 * Start all:  pm2 start ecosystem.config.cjs
 * Restart:    pm2 restart ecosystem.config.cjs
 * Stop:       pm2 stop ecosystem.config.cjs
 *
 * The backend runs in cluster mode with as many instances as vCPUs.
 * Each instance gets its own Prisma connection pool (DATABASE_POOL_SIZE),
 * so total DB connections = instances × pool size.
 *
 * For a t3.small (2 vCPU):   2 × 20 = 40 connections  (RDS default max = 87)
 * For a t3.medium (2 vCPU):  2 × 20 = 40 connections  (RDS default max = 174)
 * For a t3.large  (2 vCPU):  2 × 25 = 50 connections  (RDS default max = 341)
 */
module.exports = {
  apps: [
    {
      name: 'chatr-backend',
      cwd: './backend',
      script: 'dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        DATABASE_POOL_SIZE: '20',
        DATABASE_POOL_TIMEOUT: '10',
      },
      error_file: '/var/log/chatr/backend-error.log',
      out_file: '/var/log/chatr/backend-out.log',
      merge_logs: true,
      max_memory_restart: '512M',
    },
    {
      name: 'chatr-frontend',
      cwd: './frontend',
      script: 'node_modules/.bin/next',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/chatr/frontend-error.log',
      out_file: '/var/log/chatr/frontend-out.log',
      merge_logs: true,
      max_memory_restart: '512M',
    },
  ],
};
