import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(__dirname, '..', '.test-cache');
const CACHE_FILE = path.join(CACHE_DIR, 'e2e.json');

interface CachedTest {
  name: string;
  status: 'passed' | 'failed';
  duration: number;
  retries: number;
  project?: string;
}

interface CachedSuite {
  file: string;
  status: 'passed' | 'failed';
  duration: number;
  tests: CachedTest[];
}

class CacheReporter implements Reporter {
  private suiteMap = new Map<string, CachedSuite>();
  private startTime = 0;

  onBegin(_config: FullConfig, _suite: Suite) {
    this.startTime = Date.now();
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const file = test.location.file.replace(process.cwd() + '/', '');
    if (!this.suiteMap.has(file)) {
      this.suiteMap.set(file, { file, status: 'passed', duration: 0, tests: [] });
    }
    const suite = this.suiteMap.get(file)!;
    const status = result.status === 'passed' ? 'passed' : 'failed';
    const retries = result.retry;
    const project = test.parent?.project()?.name;

    const existing = suite.tests.find(t => t.name === test.title && t.project === project);
    if (existing) {
      existing.retries = Math.max(existing.retries, retries);
      existing.status = status;
      existing.duration = result.duration;
    } else {
      suite.tests.push({ name: test.title, status, duration: result.duration, retries, project: project || undefined });
    }

    suite.duration += result.duration;
    if (status === 'failed') suite.status = 'failed';
  }

  onEnd(result: FullResult) {
    const elapsed = Date.now() - this.startTime;
    const suites = Array.from(this.suiteMap.values());

    let total = 0, passed = 0, failed = 0, flaky = 0, totalDuration = 0;
    for (const s of suites) {
      for (const t of s.tests) {
        total++;
        if (t.status === 'passed') passed++; else failed++;
        if (t.retries > 0 && t.status === 'passed') flaky++;
      }
      totalDuration += s.duration;
    }

    const report = {
      generatedAt: new Date().toISOString(),
      summary: { total, passed, failed, flaky, suites: suites.length, duration: totalDuration, elapsed },
      suites,
      coverage: null,
    };

    try {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      fs.writeFileSync(CACHE_FILE, JSON.stringify(report));
    } catch { /* best-effort */ }
  }
}

export default CacheReporter;
