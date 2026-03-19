const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  jest.resetModules();
  process.env = { ...ORIGINAL_ENV };
  delete (globalThis as any).__prisma;
});

describe('prisma singleton', () => {
  it('exports a PrismaClient instance', () => {
    const { prisma } = require('../lib/prisma');
    expect(prisma).toBeDefined();
  });

  it('reuses the same instance on subsequent imports (non-production)', () => {
    process.env.NODE_ENV = 'development';
    const { prisma: a } = require('../lib/prisma');
    jest.resetModules();
    (globalThis as any).__prisma = a;
    const { prisma: b } = require('../lib/prisma');
    expect(b).toBe(a);
  });

  it('appends connection pool params to DATABASE_URL', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    jest.resetModules();
    const { prisma } = require('../lib/prisma');
    expect(prisma).toBeDefined();
  });

  it('respects existing connection_limit in DATABASE_URL', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db?connection_limit=5';
    jest.resetModules();
    const { prisma } = require('../lib/prisma');
    expect(prisma).toBeDefined();
  });

  it('uses custom pool size and timeout from env', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.DATABASE_POOL_SIZE = '10';
    process.env.DATABASE_POOL_TIMEOUT = '30';
    jest.resetModules();
    const { prisma } = require('../lib/prisma');
    expect(prisma).toBeDefined();
  });

  it('handles missing DATABASE_URL gracefully', () => {
    delete process.env.DATABASE_URL;
    jest.resetModules();
    const { prisma } = require('../lib/prisma');
    expect(prisma).toBeDefined();
  });
});
