import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };

/**
 * Append connection pool params to DATABASE_URL if not already present.
 *
 *  connection_limit — max connections in Prisma's pool (default: num_cpus*2+1 ≈ 5)
 *  pool_timeout     — seconds a query waits for a free connection before erroring
 *
 * In production, tune these based on:
 *   PostgreSQL max_connections (default 100)
 *   Number of Node.js instances (e.g. 4 containers → 20 each = 80 total)
 *   Reserve ~20 connections for admin/migrations/monitoring
 */
function getDatasourceUrl(): string | undefined {
  const base = process.env.DATABASE_URL;
  if (!base) return undefined;
  if (base.includes('connection_limit')) return base;

  const limit = parseInt(process.env.DATABASE_POOL_SIZE || '20', 10);
  const timeout = parseInt(process.env.DATABASE_POOL_TIMEOUT || '10', 10);
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}connection_limit=${limit}&pool_timeout=${timeout}`;
}

export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    datasourceUrl: getDatasourceUrl(),
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}
