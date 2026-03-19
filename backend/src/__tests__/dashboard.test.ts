import request from 'supertest';
import express from 'express';
import path from 'path';
import fs from 'fs';

jest.mock('child_process', () => {
  const actual = jest.requireActual('child_process');
  return { ...actual, spawn: jest.fn() };
});

jest.mock('../lib/testMode', () => ({
  setTestMode: jest.fn(),
}));

import dashboardRouter from '../routes/dashboard';

const { spawn } = require('child_process');

const app = express();
app.use(express.json());
app.use('/api/dashboard', dashboardRouter);

describe('Dashboard Routes', () => {
  const CACHE_DIR = path.join(path.resolve(__dirname, '../../..'), '.test-cache');
  const CACHE_FILES = ['backend.json', 'frontend.json', 'e2e.json', 'dashboard-metrics.json'];
  const cacheBackup: Record<string, string> = {};

  beforeAll(() => {
    for (const f of CACHE_FILES) {
      try { cacheBackup[f] = fs.readFileSync(path.join(CACHE_DIR, f), 'utf8'); } catch { /* doesn't exist */ }
    }
  });

  afterAll(() => {
    for (const f of CACHE_FILES) {
      const p = path.join(CACHE_DIR, f);
      if (cacheBackup[f]) {
        fs.writeFileSync(p, cacheBackup[f]);
      }
    }
  });

  describe('GET /api/dashboard', () => {
    it('should return dashboard data', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .expect(200);

      expect(response.body).toHaveProperty('generatedAt');
      expect(response.body).toHaveProperty('overview');
      expect(response.body).toHaveProperty('loc');
      expect(response.body).toHaveProperty('architecture');
      expect(response.body).toHaveProperty('health');
      expect(response.body).toHaveProperty('env');
    });

    it('should include overview metrics', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .expect(200);

      const { overview } = response.body;
      expect(overview).toHaveProperty('totalCommits');
      expect(overview).toHaveProperty('totalLines');
      expect(overview).toHaveProperty('totalFiles');
      expect(overview).toHaveProperty('testFiles');
      expect(overview).toHaveProperty('currentBranch');
    });

    it('should include LOC breakdown', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .expect(200);

      expect(response.body.loc).toHaveProperty('typescript');
      expect(response.body.loc).toHaveProperty('css');
      expect(response.body.loc).toHaveProperty('javascript');
      expect(response.body.locByArea).toHaveProperty('frontend');
      expect(response.body.locByArea).toHaveProperty('backend');
    });

    it('should include test breakdown', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .expect(200);

      expect(response.body.testBreakdown).toHaveProperty('frontend');
      expect(response.body.testBreakdown).toHaveProperty('backend');
      expect(response.body.testBreakdown).toHaveProperty('widget');
      expect(typeof response.body.testBreakdown.backend).toBe('number');
    });

    it('should include architecture details', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .expect(200);

      const { architecture } = response.body;
      expect(architecture).toHaveProperty('components');
      expect(architecture).toHaveProperty('hooks');
      expect(architecture).toHaveProperty('apiRoutes');
      expect(architecture).toHaveProperty('dbModels');
    });

    it('should include health metrics', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .expect(200);

      const { health } = response.body;
      expect(health).toHaveProperty('avgFileSize');
      expect(health).toHaveProperty('testRatio');
      expect(health).toHaveProperty('testCoverage');
      expect(health).toHaveProperty('commitsPerDay');
    });

    it('should include components with test status', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .expect(200);

      expect(Array.isArray(response.body.components)).toBe(true);
      if (response.body.components.length > 0) {
        const component = response.body.components[0];
        expect(component).toHaveProperty('name');
        expect(component).toHaveProperty('lines');
        expect(component).toHaveProperty('hasTest');
      }
    });

    it('should include endpoint inventory', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .expect(200);

      expect(Array.isArray(response.body.endpoints)).toBe(true);
      if (response.body.endpoints.length > 0) {
        expect(response.body.endpoints[0]).toHaveProperty('method');
        expect(response.body.endpoints[0]).toHaveProperty('path');
      }
    });

    it('should include heatmap data', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .expect(200);

      expect(Array.isArray(response.body.heatmap)).toBe(true);
      if (response.body.heatmap.length > 0) {
        expect(response.body.heatmap[0]).toHaveProperty('date');
        expect(response.body.heatmap[0]).toHaveProperty('count');
        expect(response.body.heatmap[0]).toHaveProperty('level');
      }
    });

    it('should include backend test coverage data', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .expect(200);

      expect(Array.isArray(response.body.backendModules)).toBe(true);
      expect(typeof response.body.backendTestedCount).toBe('number');
      expect(Array.isArray(response.body.backendUntestedModules)).toBe(true);

      if (response.body.backendModules.length > 0) {
        const mod = response.body.backendModules[0];
        expect(mod).toHaveProperty('name');
        expect(mod).toHaveProperty('category');
        expect(mod).toHaveProperty('lines');
        expect(mod).toHaveProperty('hasTest');
        expect(['route', 'middleware', 'lib', 'service', 'socket']).toContain(mod.category);
      }

      expect(response.body.backendTestedCount).toBeLessThanOrEqual(response.body.backendModules.length);
      expect(response.body.backendUntestedModules.every((m: any) => m.hasTest === false)).toBe(true);
    });

    it('should include frontend test coverage data', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .expect(200);

      expect(Array.isArray(response.body.frontendModules)).toBe(true);
      expect(typeof response.body.frontendTestedCount).toBe('number');
      expect(Array.isArray(response.body.frontendUntestedModules)).toBe(true);

      if (response.body.frontendModules.length > 0) {
        const mod = response.body.frontendModules[0];
        expect(mod).toHaveProperty('name');
        expect(mod).toHaveProperty('category');
        expect(mod).toHaveProperty('lines');
        expect(mod).toHaveProperty('hasTest');
        expect(['component', 'hook', 'context', 'util', 'page', 'widget']).toContain(mod.category);
      }

      expect(response.body.frontendTestedCount).toBeLessThanOrEqual(response.body.frontendModules.length);
      expect(response.body.frontendUntestedModules.every((m: any) => m.hasTest === false)).toBe(true);
    });

    it('should return cached data on subsequent requests', async () => {
      const r1 = await request(app).get('/api/dashboard').expect(200);
      const r2 = await request(app).get('/api/dashboard').expect(200);

      expect(r1.body.generatedAt).toBe(r2.body.generatedAt);
    });

    it('should respond with JSON content type', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('POST /api/dashboard/invalidate', () => {
    it('should invalidate the cache', async () => {
      // First fetch to populate cache
      const r1 = await request(app).get('/api/dashboard').expect(200);

      // Invalidate
      const inv = await request(app)
        .post('/api/dashboard/invalidate')
        .expect(200);

      expect(inv.body).toEqual({ ok: true });

      // Next fetch should regenerate (new timestamp)
      const r2 = await request(app).get('/api/dashboard').expect(200);
      expect(r2.body.generatedAt).not.toBe(r1.body.generatedAt);
    });

    it('should respond with JSON content type', async () => {
      const response = await request(app)
        .post('/api/dashboard/invalidate')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  // ── parsePlaywrightJson error handling (before E2E sets liveRuns) ─────
  describe('parsePlaywrightJson error handling', () => {
    const TEST_ROOT = path.resolve(__dirname, '../../..');
    const E2E_JSON_PATH = path.join(TEST_ROOT, 'e2e-results.json');

    it('returns none when e2e-results.json contains invalid JSON', async () => {
      fs.writeFileSync(E2E_JSON_PATH, 'NOT VALID JSON!!!');

      const res = await request(app).get('/api/dashboard/tests/e2e');
      expect(['ready', 'none']).toContain(res.body.status);
      if (res.body.status === 'ready') {
        expect(res.body.summary).toBeDefined();
      }

      try { fs.unlinkSync(E2E_JSON_PATH); } catch { /* ignore */ }
    });
  });

  // ── E2E Test Routes ───────────────────────────────────────────────────
  describe('E2E test routes', () => {
    const TEST_ROOT = path.resolve(__dirname, '../../..');
    const E2E_JSON_PATH = path.join(TEST_ROOT, 'e2e-results.json');

    function createMockChild() {
      return {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
      };
    }

    it('runs full e2e lifecycle: start, running, complete, ready', async () => {
      const child = createMockChild();
      spawn.mockReturnValue(child);

      const startRes = await request(app).post('/api/dashboard/tests/e2e/run');
      expect(startRes.status).toBe(200);
      expect(startRes.body.status).toBe('started');
      expect(spawn).toHaveBeenCalled();

      const runningRes = await request(app).get('/api/dashboard/tests/e2e');
      expect(runningRes.status).toBe(200);
      expect(runningRes.body.status).toBe('running');
      expect(runningRes.body).toHaveProperty('startedAt');
      expect(runningRes.body).toHaveProperty('elapsed');
      expect(runningRes.body).toHaveProperty('liveResults');
      expect(runningRes.body).toHaveProperty('liveSummary');

      const dupeRes = await request(app).post('/api/dashboard/tests/e2e/run');
      expect(dupeRes.body.status).toBe('running');

      const dataCallback = child.stdout.on.mock.calls.find((c: any) => c[0] === 'data');
      expect(dataCallback).toBeDefined();
      dataCallback[1](Buffer.from('  \u2713 1 [chromium] \u203a tests/auth.spec.ts \u203a should login (500ms)\n'));
      // Push same test again to exercise the retry/existing-result branch
      dataCallback[1](Buffer.from('  \u2713 1 [chromium] \u203a tests/auth.spec.ts \u203a should login (600ms)\n'));

      const closeCallback = child.on.mock.calls.find((c: any) => c[0] === 'close');
      expect(closeCallback).toBeDefined();
      closeCallback[1](0);

      const readyRes = await request(app).get('/api/dashboard/tests/e2e');
      expect(readyRes.status).toBe(200);
      expect(readyRes.body.status).toBe('ready');
      expect(readyRes.body.summary).toBeDefined();
      expect(readyRes.body.summary.total).toBeGreaterThanOrEqual(1);
    });

    it('parses Playwright JSON from e2e-results.json on close', async () => {
      const child = createMockChild();
      spawn.mockReturnValue(child);

      // Previous run completed; start a new one
      const startRes = await request(app).post('/api/dashboard/tests/e2e/run');
      expect(startRes.body.status).toBe('started');

      // Write a Playwright-format JSON results file after the run starts
      const playwrightJson = {
        suites: [{
          title: 'chromium',
          suites: [{
            file: 'tests/auth.spec.ts',
            title: 'Auth',
            specs: [{
              title: 'should login',
              tests: [{
                projectName: 'chromium',
                results: [{ status: 'passed', duration: 500 }],
              }],
            }],
            suites: [],
          }],
          specs: [],
        }],
        stats: { duration: 5000 },
      };
      fs.writeFileSync(E2E_JSON_PATH, JSON.stringify(playwrightJson));

      // Simulate close — handler reads e2e-results.json and parses it
      const closeCallback = child.on.mock.calls.find((c: any) => c[0] === 'close');
      expect(closeCallback).toBeDefined();
      closeCallback[1](0);

      try { fs.unlinkSync(E2E_JSON_PATH); } catch { /* ignore */ }

      const res = await request(app).get('/api/dashboard/tests/e2e');
      expect(res.body.status).toBe('ready');
      expect(res.body.summary).toBeDefined();
    });

    it('handles child process error event', async () => {
      const child = createMockChild();
      spawn.mockReturnValue(child);

      await request(app).post('/api/dashboard/tests/e2e/run');

      const errorCallback = child.on.mock.calls.find((c: any) => c[0] === 'error');
      expect(errorCallback).toBeDefined();
      errorCallback[1](new Error('spawn failed'));

      const res = await request(app).get('/api/dashboard/tests/e2e');
      expect(res.status).toBe(200);
      expect(['error', 'none', 'ready']).toContain(res.body.status);
    });

    it('falls back to e2e-results.json when no disk cache exists', async () => {
      const cacheFile = path.join(path.resolve(__dirname, '../../..'), '.test-cache', 'e2e.json');
      let cacheBackup: string | null = null;
      try { cacheBackup = fs.readFileSync(cacheFile, 'utf8'); fs.unlinkSync(cacheFile); } catch { /* ignore */ }

      const playwrightJson = {
        suites: [{
          title: 'chromium',
          suites: [{
            file: 'tests/home.spec.ts',
            title: 'Home',
            specs: [{ title: 'loads page', tests: [{ projectName: 'chromium', results: [{ status: 'passed', duration: 300 }] }] }],
            suites: [{ title: 'nested', specs: [{ title: 'nested test', tests: [{ projectName: 'chromium', results: [{ status: 'failed', duration: 100 }] }] }], suites: [] }],
          }],
          specs: [],
        }],
        stats: { duration: 3000 },
      };
      fs.writeFileSync(E2E_JSON_PATH, JSON.stringify(playwrightJson));

      const res = await request(app).get('/api/dashboard/tests/e2e');
      expect(res.body.status).toBe('ready');
      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.total).toBeGreaterThanOrEqual(2);

      try { fs.unlinkSync(E2E_JSON_PATH); } catch { /* ignore */ }
      if (cacheBackup) fs.writeFileSync(cacheFile, cacheBackup);
    });

    it('returns none when no e2e data exists at all', async () => {
      try { fs.unlinkSync(E2E_JSON_PATH); } catch { /* ignore */ }
      const cacheFile = path.join(path.resolve(__dirname, '../../..'), '.test-cache', 'e2e.json');
      let backup: string | null = null;
      try { backup = fs.readFileSync(cacheFile, 'utf8'); fs.unlinkSync(cacheFile); } catch { /* ignore */ }

      const res = await request(app).get('/api/dashboard/tests/e2e');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('none');

      if (backup) fs.writeFileSync(cacheFile, backup);
    });
  });

  // ── loadTestReport error + 'none' (before unit runs populate state) ──
  describe('Unit test results with no/corrupted data', () => {
    const TEST_ROOT = path.resolve(__dirname, '../../..');
    const CACHE_DIR = path.join(TEST_ROOT, '.test-cache');
    const CACHE_FILE = path.join(CACHE_DIR, 'backend.json');

    it('returns none when cached report is corrupted (loadTestReport catch)', async () => {
      let backup: string | null = null;
      if (fs.existsSync(CACHE_FILE)) {
        backup = fs.readFileSync(CACHE_FILE, 'utf8');
      } else {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
      }
      fs.writeFileSync(CACHE_FILE, 'CORRUPT JSON!!!');

      const res = await request(app).get('/api/dashboard/tests/backend');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('none');

      if (backup) {
        fs.writeFileSync(CACHE_FILE, backup);
      } else {
        try { fs.unlinkSync(CACHE_FILE); } catch { /* ignore */ }
      }
    });
  });

  // ── Unit Test Routes ──────────────────────────────────────────────────
  describe('Unit test routes', () => {
    function createMockChild() {
      return {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
      };
    }

    it('GET /tests/:area returns 400 for invalid area', async () => {
      const res = await request(app).get('/api/dashboard/tests/invalid');
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/backend|frontend/i);
    });

    it('POST /tests/:area/run returns 400 for invalid area', async () => {
      const res = await request(app).post('/api/dashboard/tests/invalid/run');
      expect(res.status).toBe(400);
    });

    it('GET /tests/backend returns a valid status', async () => {
      const res = await request(app).get('/api/dashboard/tests/backend');
      expect(res.status).toBe(200);
      expect(['none', 'ready']).toContain(res.body.status);
    });

    it('completes full frontend run lifecycle', async () => {
      const child = createMockChild();
      spawn.mockReturnValue(child);

      // Start a frontend run
      const startRes = await request(app).post('/api/dashboard/tests/frontend/run');
      expect(startRes.body.status).toBe('started');

      // Verify running state
      const runningRes = await request(app).get('/api/dashboard/tests/frontend');
      expect(runningRes.body.status).toBe('running');
      expect(runningRes.body).toHaveProperty('liveResults');
      expect(runningRes.body).toHaveProperty('liveSummary');

      // Duplicate start returns running
      const dupeRes = await request(app).post('/api/dashboard/tests/frontend/run');
      expect(dupeRes.body.status).toBe('running');

      // Simulate Jest stdout data
      const dataCallback = child.stdout.on.mock.calls.find((c: any) => c[0] === 'data');
      if (dataCallback) {
        dataCallback[1](Buffer.from('PASS src/__tests__/auth.test.ts (2.5s)\n  \u2713 should authenticate (15 ms)\n'));
      }

      // Simulate close
      const closeCallback = child.on.mock.calls.find((c: any) => c[0] === 'close');
      if (closeCallback) closeCallback[1](0);

      const res = await request(app).get('/api/dashboard/tests/frontend');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.total).toBeGreaterThanOrEqual(1);
      expect(res.body.summary.passed).toBeGreaterThanOrEqual(1);
    });

    it('POST /tests/:area/run with failedOnly=true and no failures returns skipped', async () => {
      // Frontend run completed with all passed — failedOnly should skip
      const res = await request(app)
        .post('/api/dashboard/tests/frontend/run')
        .send({ failedOnly: true });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('skipped');
      expect(res.body.message).toMatch(/No failed tests/i);
    });

    it('POST /tests/backend/run starts a test run and handles error', async () => {
      const child = createMockChild();
      spawn.mockReturnValue(child);

      const res = await request(app).post('/api/dashboard/tests/backend/run');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('started');

      const errorCallback = child.on.mock.calls.find((c: any) => c[0] === 'error');
      expect(errorCallback).toBeDefined();
      errorCallback[1](new Error('unit spawn failed'));

      // Also fire close so the run is fully cleaned up for subsequent tests
      const closeCallback = child.on.mock.calls.find((c: any) => c[0] === 'close');
      if (closeCallback) closeCallback[1](1);

      const statusRes = await request(app).get('/api/dashboard/tests/backend');
      expect(statusRes.status).toBe(200);
    });

    it('completes backend run with failures then reruns failedOnly', async () => {
      const child = createMockChild();
      spawn.mockReturnValue(child);

      const startRes = await request(app).post('/api/dashboard/tests/backend/run');
      expect(startRes.body.status).toBe('started');

      const dataCallback = child.stdout.on.mock.calls.find((c: any) => c[0] === 'data');
      expect(dataCallback).toBeDefined();
      dataCallback[1](Buffer.from('FAIL src/__tests__/auth.test.ts\n  \u2715 should authenticate (15 ms)\n'));

      const closeCallback = child.on.mock.calls.find((c: any) => c[0] === 'close');
      expect(closeCallback).toBeDefined();
      closeCallback[1](1);

      const readyRes = await request(app).get('/api/dashboard/tests/backend');
      expect(readyRes.body.status).toBe('ready');
      expect(readyRes.body.summary.failed).toBeGreaterThanOrEqual(1);

      const child2 = createMockChild();
      spawn.mockReturnValue(child2);

      const failedRes = await request(app)
        .post('/api/dashboard/tests/backend/run')
        .send({ failedOnly: true });

      expect(failedRes.body.status).toBe('started');
      const lastSpawnArgs = spawn.mock.calls[spawn.mock.calls.length - 1];
      expect(lastSpawnArgs[1]).toEqual(expect.arrayContaining(['--testNamePattern']));
    });

    it('reads coverage-summary.json on close if present', async () => {
      const TEST_ROOT = path.resolve(__dirname, '../../..');
      const covDir = path.join(TEST_ROOT, 'frontend', 'coverage');
      const covPath = path.join(covDir, 'coverage-summary.json');
      const covExists = fs.existsSync(covPath);
      let originalCov: string | null = null;

      if (covExists) {
        originalCov = fs.readFileSync(covPath, 'utf8');
      } else {
        fs.mkdirSync(covDir, { recursive: true });
      }

      const fakeCov = {
        total: {
          statements: { pct: 85.5 },
          branches: { pct: 70.2 },
          functions: { pct: 90.1 },
          lines: { pct: 88.3 },
        },
      };
      fs.writeFileSync(covPath, JSON.stringify(fakeCov));

      const child = createMockChild();
      spawn.mockReturnValue(child);

      await request(app).post('/api/dashboard/tests/frontend/run');

      const closeCallback = child.on.mock.calls.find((c: any) => c[0] === 'close');
      expect(closeCallback).toBeDefined();
      closeCallback[1](0);

      const res = await request(app).get('/api/dashboard/tests/frontend');
      expect(res.body.status).toBe('ready');
      expect(res.body.coverage).toBeDefined();
      expect(res.body.coverage.statements).toBe(85.5);
      expect(res.body.coverage.branches).toBe(70.2);

      if (originalCov) {
        fs.writeFileSync(covPath, originalCov);
      } else {
        try { fs.unlinkSync(covPath); } catch { /* ignore */ }
      }
    });

    it('handles corrupted coverage-summary.json gracefully', async () => {
      const TEST_ROOT = path.resolve(__dirname, '../../..');
      const covDir = path.join(TEST_ROOT, 'frontend', 'coverage');
      const covPath = path.join(covDir, 'coverage-summary.json');
      const covExists = fs.existsSync(covPath);
      let originalCov: string | null = null;

      if (covExists) {
        originalCov = fs.readFileSync(covPath, 'utf8');
      } else {
        fs.mkdirSync(covDir, { recursive: true });
      }
      fs.writeFileSync(covPath, 'CORRUPT COVERAGE JSON!!!');

      const child = createMockChild();
      spawn.mockReturnValue(child);

      await request(app).post('/api/dashboard/tests/frontend/run');

      const closeCallback = child.on.mock.calls.find((c: any) => c[0] === 'close');
      expect(closeCallback).toBeDefined();
      closeCallback[1](0);

      const res = await request(app).get('/api/dashboard/tests/frontend');
      expect(res.body.status).toBe('ready');
      expect(res.body.coverage).toBeNull();

      if (originalCov) {
        fs.writeFileSync(covPath, originalCov);
      } else {
        try { fs.unlinkSync(covPath); } catch { /* ignore */ }
      }
    });
  });
});

// ── Isolated module: requireTestPassword ─────────────────────────────────
describe('Dashboard with test password required', () => {
  let passwordApp: any;

  const origNodeEnv = process.env.NODE_ENV;

  beforeAll(() => {
    process.env.DASHBOARD_TEST_PASSWORD = 'secret123';
    process.env.NODE_ENV = 'production';

    jest.isolateModules(() => {
      jest.doMock('child_process', () => {
        const actual = jest.requireActual('child_process');
        return { ...actual, spawn: jest.fn() };
      });

      const express = require('express');
      const router = require('../routes/dashboard').default;
      passwordApp = express();
      passwordApp.use(express.json());
      passwordApp.use('/api/dashboard', router);
    });
  });

  afterAll(() => {
    delete process.env.DASHBOARD_TEST_PASSWORD;
    process.env.NODE_ENV = origNodeEnv;
  });

  it('rejects e2e/run with wrong password', async () => {
    const res = await request(passwordApp)
      .post('/api/dashboard/tests/e2e/run')
      .set('x-test-password', 'wrong');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid password');
  });

  it('rejects unit run without password header', async () => {
    const res = await request(passwordApp)
      .post('/api/dashboard/tests/backend/run');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid password');
  });

  it('does not reject e2e/run with correct password', async () => {
    const res = await request(passwordApp)
      .post('/api/dashboard/tests/e2e/run')
      .set('x-test-password', 'secret123');
    expect(res.status).not.toBe(401);
  });
});
