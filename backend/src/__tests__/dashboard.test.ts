import request from 'supertest';
import express from 'express';
import dashboardRouter from '../routes/dashboard';

const app = express();
app.use(express.json());
app.use('/api/dashboard', dashboardRouter);

describe('Dashboard Routes', () => {
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
});
