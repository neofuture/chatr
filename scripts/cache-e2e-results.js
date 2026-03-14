#!/usr/bin/env node

/**
 * Cache E2E test results from e2e-results.json → .test-cache/e2e.json
 *
 * Run after `npx playwright test` to persist results across restarts.
 * The custom Playwright reporter (e2e/cache-reporter.ts) does this
 * automatically, but this script is useful for retroactive caching.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'e2e-results.json');
const DEST_DIR = path.join(ROOT, '.test-cache');
const DEST = path.join(DEST_DIR, 'e2e.json');

if (!fs.existsSync(SRC)) {
  console.log('No e2e-results.json found — run e2e tests first.');
  process.exit(0);
}

const raw = fs.readFileSync(SRC, 'utf8');
let json;
try {
  const jsonStart = raw.indexOf('{');
  json = JSON.parse(jsonStart >= 0 ? raw.substring(jsonStart) : raw);
} catch (err) {
  console.error('Failed to parse e2e-results.json:', err.message);
  process.exit(1);
}

const suiteMap = new Map();

function collectSpecs(node, file, prefix, project) {
  const suite = suiteMap.get(file);
  for (const spec of node.specs || []) {
    for (const test of spec.tests || []) {
      const results = test.results || [];
      const last = results[results.length - 1];
      const status = last?.status === 'passed' ? 'passed' : 'failed';
      const duration = last?.duration || 0;
      const retries = Math.max(0, results.length - 1);
      suite.tests.push({
        name: prefix ? `${prefix} > ${spec.title}` : spec.title,
        status, duration, retries,
        project: test.projectName || project || undefined,
      });
      suite.duration += duration;
      if (status === 'failed') suite.status = 'failed';
    }
  }
  for (const child of node.suites || []) {
    collectSpecs(child, file, prefix ? `${prefix} > ${child.title}` : child.title, project);
  }
}

function walkSuites(nodes, inheritedProject) {
  for (const node of nodes) {
    const file = node.file ? node.file.replace(ROOT + '/', '') : '';
    const project = node.project?.name || inheritedProject;
    if (file) {
      if (!suiteMap.has(file)) suiteMap.set(file, { file, status: 'passed', duration: 0, tests: [] });
      collectSpecs(node, file, '', project);
    } else {
      const projFromTitle = !file && node.title && ['chromium', 'mobile', 'setup', 'teardown'].includes(node.title.toLowerCase()) ? node.title.toLowerCase() : '';
      walkSuites(node.suites || [], projFromTitle || project);
    }
  }
}

walkSuites(json.suites || [], '');

const suites = Array.from(suiteMap.values());
let total = 0, passed = 0, failed = 0, flaky = 0, dur = 0;
for (const s of suites) {
  for (const t of s.tests) {
    total++;
    if (t.status === 'passed') passed++; else failed++;
    if (t.retries > 0 && t.status === 'passed') flaky++;
  }
  dur += s.duration;
}

const report = {
  generatedAt: new Date().toISOString(),
  summary: { total, passed, failed, flaky, suites: suites.length, duration: dur, elapsed: json.stats?.duration || undefined },
  suites,
  coverage: null,
};

fs.mkdirSync(DEST_DIR, { recursive: true });
fs.writeFileSync(DEST, JSON.stringify(report));
console.log(`Cached ${total} e2e test results (${passed} passed, ${failed} failed) → .test-cache/e2e.json`);
