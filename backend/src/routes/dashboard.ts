import { Router, Request, Response } from 'express';
import { execSync, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { setTestMode } from '../lib/testMode';

const router = Router();
const ROOT = path.resolve(__dirname, '../../../');
const SKIP = new Set(['node_modules', '.next', 'dist', 'coverage', '.git']);
const TEST_PASSWORD = process.env.DASHBOARD_TEST_PASSWORD || '';

const PW_BIN = path.join(ROOT, 'node_modules', '.bin', 'playwright');
const JEST_BIN_BE = path.join(ROOT, 'backend', 'node_modules', '.bin', 'jest');
const JEST_BIN_FE = path.join(ROOT, 'frontend', 'node_modules', '.bin', 'jest');
const RUN_STATE_PATH = path.join(ROOT, '.test-cache', 'run-state.json');

function requireTestPassword(req: Request, res: Response): boolean {
  if (!TEST_PASSWORD) return false;
  if (process.env.NODE_ENV !== 'production') return false;
  const pw = req.headers['x-test-password'] as string | undefined;
  if (pw !== TEST_PASSWORD) {
    res.status(401).json({ error: 'Invalid password' });
    return true;
  }
  return false;
}

let cache: { data: object; ts: number } | null = null;
const CACHE_TTL = 300_000;
const DASH_CACHE_PATH = path.join(ROOT, '.test-cache', 'dashboard-metrics.json');

function saveDashCache(data: object) {
  try {
    fs.mkdirSync(path.dirname(DASH_CACHE_PATH), { recursive: true });
    fs.writeFileSync(DASH_CACHE_PATH, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* ignore */ }
}

function loadDashCache(): { data: object; ts: number } | null {
  try {
    if (!fs.existsSync(DASH_CACHE_PATH)) return null;
    return JSON.parse(fs.readFileSync(DASH_CACHE_PATH, 'utf8'));
  } catch { return null; }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function git(cmd: string): string {
  try { return execSync(`git ${cmd}`, { cwd: ROOT, timeout: 8000, encoding: 'utf8' }).trim(); }
  catch /* istanbul ignore next */ { return ''; }
}

function run(cmd: string): string {
  try { return execSync(cmd, { timeout: 5000, encoding: 'utf8' }).trim(); }
  catch /* istanbul ignore next */ { return ''; }
}

function walk(dir: string, extensions: string[], collect: (fullPath: string, name: string, lines: number) => void, extraSkip?: Set<string>) {
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP.has(entry.name)) continue;
      if (extraSkip && extraSkip.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full, extensions, collect, extraSkip); }
      else if (extensions.some(ext => entry.name.endsWith(ext)) && !entry.name.endsWith('.d.ts') && !entry.name.endsWith('.min.js')) {
        try { collect(full, entry.name, fs.readFileSync(full, 'utf8').split('\n').length); }
        catch { /* skip */ }
      }
    }
  } catch { /* skip */ }
}

const SKIP_TESTS = new Set(['__tests__']);

function collectFiles(dir: string, extensions: string[], skipTests = true): { name: string; path: string; lines: number }[] {
  const r: { name: string; path: string; lines: number }[] = [];
  walk(dir, extensions, (fp, name, lines) => r.push({ name, path: fp.replace(ROOT + '/', ''), lines }), skipTests ? SKIP_TESTS : undefined);
  return r;
}

function countLines(dir: string, extensions: string[], skipTests = true): number {
  let t = 0; walk(dir, extensions, (_f, _n, l) => { t += l; }, skipTests ? SKIP_TESTS : undefined); return t;
}

function countFiles(dir: string, extensions: string[], skipTests = true): number {
  let t = 0; walk(dir, extensions, () => { t++; }, skipTests ? SKIP_TESTS : undefined); return t;
}

function listDirNames(dir: string): string[] {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter(e => e.isDirectory() && !SKIP.has(e.name) && !e.name.startsWith('.'))
      .map(e => e.name).sort();
  } catch /* istanbul ignore next */ { return []; }
}

function parsePrismaModels(): { name: string; fields: number; relations: number }[] {
  try {
    const schema = fs.readFileSync(path.join(ROOT, 'backend/prisma/schema.prisma'), 'utf8');
    const models: { name: string; fields: number; relations: number }[] = [];
    const blocks = schema.split(/^model\s+/gm).slice(1);
    for (const block of blocks) {
      const nameMatch = block.match(/^(\w+)/);
      if (!nameMatch) continue;
      const body = block.substring(block.indexOf('{') + 1, block.indexOf('}'));
      const lines = body.split('\n').filter(l => l.trim() && !l.trim().startsWith('//') && !l.trim().startsWith('@@'));
      const relations = lines.filter(l => l.includes('@relation')).length;
      models.push({ name: nameMatch[1], fields: lines.length, relations });
    }
    return models;
  } catch /* istanbul ignore next */ { return []; }
}

function readPkgDeps(pkgPath: string): { prod: number; dev: number; prodList: string[]; devList: string[] } {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const prodList = Object.keys(pkg.dependencies || {}).sort();
    const devList = Object.keys(pkg.devDependencies || {}).sort();
    return { prod: prodList.length, dev: devList.length, prodList, devList };
  } catch /* istanbul ignore next */ { return { prod: 0, dev: 0, prodList: [], devList: [] }; }
}

function readPkgScripts(pkgPath: string): { name: string; command: string }[] {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return Object.entries(pkg.scripts || {}).map(([name, command]) => ({ name, command: String(command) }));
  } catch /* istanbul ignore next */ { return []; }
}

function scanTodos(dir: string, extensions: string[]): { file: string; line: number; type: string; text: string }[] {
  const results: { file: string; line: number; type: string; text: string }[] = [];
  walk(dir, extensions, (fullPath) => {
    try {
      const lines = fs.readFileSync(fullPath, 'utf8').split('\n');
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/\/\/\s*(TODO|FIXME|HACK|XXX|WARN)[:\s]+(.*)/i);
        if (match) results.push({ file: fullPath.replace(ROOT + '/', ''), line: i + 1, type: match[1].toUpperCase(), text: match[2].trim() });
      }
    } catch { /* skip */ }
  });
  return results;
}

function scanEndpoints(dir: string): { method: string; path: string; file: string }[] {
  const endpoints: { method: string; path: string; file: string }[] = [];
  const methodRe = /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)/gi;
  walk(dir, ['.ts'], (fullPath, _name) => {
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      let m;
      while ((m = methodRe.exec(content)) !== null) {
        endpoints.push({ method: m[1].toUpperCase(), path: m[2], file: fullPath.replace(ROOT + '/', '') });
      }
      methodRe.lastIndex = 0;
    } catch { /* skip */ }
  });
  return endpoints;
}

function scanSocketEvents(dir: string): { event: string; direction: 'emit' | 'on'; file: string }[] {
  const events: { event: string; direction: 'emit' | 'on'; file: string }[] = [];
  const emitRe = /\.emit\s*\(\s*['"`]([^'"`]+)/g;
  const onRe = /\.on\s*\(\s*['"`]([^'"`]+)/g;
  walk(dir, ['.ts'], (fullPath) => {
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      let m;
      while ((m = emitRe.exec(content)) !== null) events.push({ event: m[1], direction: 'emit', file: fullPath.replace(ROOT + '/', '') });
      emitRe.lastIndex = 0;
      while ((m = onRe.exec(content)) !== null) events.push({ event: m[1], direction: 'on', file: fullPath.replace(ROOT + '/', '') });
      onRe.lastIndex = 0;
    } catch { /* skip */ }
  });
  const unique = new Map<string, { event: string; direction: 'emit' | 'on'; file: string }>();
  for (const e of events) {
    const key = `${e.direction}:${e.event}`;
    if (!unique.has(key)) unique.set(key, e);
  }
  return [...unique.values()].sort((a, b) => a.event.localeCompare(b.event));
}

// ---------------------------------------------------------------------------
// Build payload
// ---------------------------------------------------------------------------

function buildDashboard(): object {
  const logRaw = git('log --format="%h|%aI|%aN|%s" --no-merges');
  const commits: { hash: string; date: string; iso: string; author: string; message: string; hour: number; day: number }[] = [];
  const dailyMap: Record<string, number> = {};
  const weeklyMap: Record<string, number> = {};
  const authorMap: Record<string, number> = {};
  const hourMap: number[] = Array(24).fill(0);
  const dayMap: number[] = Array(7).fill(0);
  let totalMsgLen = 0;
  const wordFreq: Record<string, number> = {};

  if (logRaw) {
    for (const line of logRaw.split('\n')) {
      const p0 = line.indexOf('|'); if (p0 === -1) continue;
      const hash = line.substring(0, p0);
      const afterHash = line.substring(p0 + 1);
      const p1 = afterHash.indexOf('|'); if (p1 === -1) continue;
      const iso = afterHash.substring(0, p1);
      const rest = afterHash.substring(p1 + 1);
      const p2 = rest.indexOf('|');
      const author = p2 !== -1 ? rest.substring(0, p2) : 'Unknown';
      const message = p2 !== -1 ? rest.substring(p2 + 1) : rest;

      const d = new Date(iso);
      const date = iso.substring(0, 10);
      const hour = d.getHours();
      const day = d.getDay();
      const yr = d.getFullYear();
      const wk = Math.ceil(((d.getTime() - new Date(yr, 0, 1).getTime()) / 86400000 + new Date(yr, 0, 1).getDay() + 1) / 7);
      const weekKey = `${yr}-W${String(wk).padStart(2, '0')}`;

      commits.push({ hash, date, iso, author, message, hour, day });
      dailyMap[date] = (dailyMap[date] || 0) + 1;
      weeklyMap[weekKey] = (weeklyMap[weekKey] || 0) + 1;
      authorMap[author] = (authorMap[author] || 0) + 1;
      hourMap[hour]++;
      dayMap[day]++;

      totalMsgLen += message.length;
      for (const w of message.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)) {
        if (w.length > 2) wordFreq[w] = (wordFreq[w] || 0) + 1;
      }
    }
  }

  const dailyCommits = Object.entries(dailyMap).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
  const weeklyCommits = Object.entries(weeklyMap).map(([week, count]) => ({ week, count })).sort((a, b) => a.week.localeCompare(b.week));

  // Heatmap (last 52 weeks)
  const today = new Date();
  const heatmap: { date: string; count: number; level: number }[] = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const key = d.toISOString().substring(0, 10);
    const count = dailyMap[key] || 0;
    heatmap.push({ date: key, count, level: count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 10 ? 3 : 4 });
  }

  // Contributors
  const contributors = Object.entries(authorMap)
    .map(([name, commitCount]) => ({ name, commits: commitCount, firstCommit: '', lastCommit: '' }))
    .sort(/* istanbul ignore next */ (a, b) => b.commits - a.commits);
  for (const c of contributors) {
    const ac = commits.filter(cm => cm.author === c.name);
    c.firstCommit = ac[ac.length - 1]?.date || '';
    c.lastCommit = ac[0]?.date || '';
  }

  // Commit message analytics
  const topWords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([word, count]) => ({ word, count }));
  const avgMsgLength = commits.length > 0 ? Math.round(totalMsgLen / commits.length) : 0;

  // Source dirs
  const frontendDir = path.join(ROOT, 'frontend/src');
  const backendDir = path.join(ROOT, 'backend/src');
  const widgetDir = path.join(ROOT, 'widget-src');

  // LOC
  const tsLines = countLines(frontendDir, ['.ts', '.tsx']) + countLines(backendDir, ['.ts']);
  const cssLines = countLines(frontendDir, ['.css']);
  const jsLines = countLines(widgetDir, ['.js']);
  let shellLines = 0;
  let shellFiles = 0;
  try {
    for (const f of fs.readdirSync(ROOT)) {
      if (f.endsWith('.sh')) {
        shellFiles++;
        shellLines += fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').length;
      }
    }
  } catch { /* */ }
  const feLines = countLines(frontendDir, ['.ts', '.tsx', '.css']);
  const beLines = countLines(backendDir, ['.ts']);
  const wLines = countLines(widgetDir, ['.js']);

  // File counts
  const tsFiles = countFiles(frontendDir, ['.ts', '.tsx']) + countFiles(backendDir, ['.ts']);
  const cssFiles = countFiles(frontendDir, ['.css']);
  const jsFiles = countFiles(widgetDir, ['.js']);
  const tsxFiles = countFiles(frontendDir, ['.tsx']);
  const pureTs = tsFiles - tsxFiles;
  const moduleCss = countFiles(frontendDir, ['.module.css']);
  const plainCss = cssFiles - moduleCss;

  // Tests
  const feTestFiles = countFiles(frontendDir, ['.test.ts', '.test.tsx'], false);
  const beTestFiles = countFiles(backendDir, ['.test.ts'], false);
  const widgetTestFiles = countFiles(path.join(ROOT, 'widget-src'), ['.test.js'], false);
  const testFileTotal = feTestFiles + beTestFiles + widgetTestFiles;

  // Git metadata
  const totalCommits = commits.length;
  const firstCommitDate = commits.length ? commits[commits.length - 1].date : null;
  const latestCommitDate = commits.length ? commits[0].date : null;
  const currentBranch = git('rev-parse --abbrev-ref HEAD');
  const latestHash = git('log -1 --format=%h');
  const latestMessage = git('log -1 --format=%s');
  // Recent commits with per-commit size (insertions/deletions/files changed) — exclude version bumps
  const commitSizeRaw = git('log -80 --no-merges --format="HASH:%h|%s" --shortstat');
  const commitSizes: Record<string, { added: number; deleted: number; files: number }> = {};
  const bumpHashes = new Set<string>();
  if (commitSizeRaw) {
    let currentHash = '';
    for (const line of commitSizeRaw.split('\n')) {
      if (line.startsWith('HASH:')) {
        const [hash, ...msgParts] = line.substring(5).split('|');
        currentHash = hash;
        const msg = msgParts.join('|').toLowerCase();
        if (msg.includes('chore') && msg.includes('bump') && msg.includes('version')) {
          bumpHashes.add(currentHash);
        }
      } else if (currentHash && line.includes('changed')) {
        const addMatch = line.match(/(\d+) insertion/);
        const delMatch = line.match(/(\d+) deletion/);
        const filesMatch = line.match(/(\d+) file/);
        commitSizes[currentHash] = {
          added: addMatch ? parseInt(addMatch[1], 10) : 0,
          deleted: delMatch ? parseInt(delMatch[1], 10) : 0,
          files: filesMatch ? parseInt(filesMatch[1], 10) : 0,
        };
      }
    }
  }
  const recentCommits = commits
    .filter(c => !bumpHashes.has(c.hash))
    .slice(0, 50)
    .map(c => ({
      hash: c.hash, date: c.date, message: c.message, author: c.author,
      added: commitSizes[c.hash]?.added ?? 0,
      deleted: commitSizes[c.hash]?.deleted ?? 0,
      files: commitSizes[c.hash]?.files ?? 0,
    }));

  // Commit type breakdown (conventional commit prefixes)
  const typeMap: Record<string, number> = {};
  for (const c of commits) {
    const m = c.message.match(/^(\w+)[\s(:!]/);
    const type = m ? m[1].toLowerCase() : 'other';
    const normalised = ['feat', 'fix', 'chore', 'test', 'docs', 'style', 'refactor', 'perf', 'ci', 'build'].includes(type) ? type : 'other';
    typeMap[normalised] = (typeMap[normalised] || 0) + 1;
  }
  const commitTypes = Object.entries(typeMap)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  // Commit size distribution
  const sizeBuckets = { tiny: 0, small: 0, medium: 0, large: 0, huge: 0 };
  const allSizes = Object.values(commitSizes);
  for (const s of allSizes) {
    const total = s.added + s.deleted;
    if (total <= 10) sizeBuckets.tiny++;
    else if (total <= 50) sizeBuckets.small++;
    else if (total <= 200) sizeBuckets.medium++;
    else if (total <= 500) sizeBuckets.large++;
    else sizeBuckets.huge++;
  }
  const avgCommitSize = allSizes.length > 0
    ? Math.round(allSizes.reduce((sum, s) => sum + s.added + s.deleted, 0) / allSizes.length)
    : 0;
  const avgFilesPerCommit = allSizes.length > 0
    ? +(allSizes.reduce((sum, s) => sum + s.files, 0) / allSizes.length).toFixed(1)
    : 0;

  // Weekly velocity (insertions/deletions aggregated per week)
  const weeklyVelocity: Record<string, { added: number; deleted: number; commits: number }> = {};
  for (const c of recentCommits) {
    const d = new Date(c.date);
    const yr = d.getFullYear();
    const wk = Math.ceil(((d.getTime() - new Date(yr, 0, 1).getTime()) / 86400000 + new Date(yr, 0, 1).getDay() + 1) / 7);
    const weekKey = `${yr}-W${String(wk).padStart(2, '0')}`;
    if (!weeklyVelocity[weekKey]) weeklyVelocity[weekKey] = { added: 0, deleted: 0, commits: 0 };
    weeklyVelocity[weekKey].added += c.added;
    weeklyVelocity[weekKey].deleted += c.deleted;
    weeklyVelocity[weekKey].commits++;
  }
  const weeklyVelocityArr = Object.entries(weeklyVelocity)
    .map(([week, v]) => ({ week, ...v }))
    .sort((a, b) => a.week.localeCompare(b.week));

  // Biggest commits (top 5 by total changes)
  const biggestCommits = [...recentCommits]
    .sort((a, b) => (b.added + b.deleted) - (a.added + a.deleted))
    .slice(0, 5)
    .map(c => ({ hash: c.hash, message: c.message, added: c.added, deleted: c.deleted, files: c.files, date: c.date }));

  // Components
  const componentsDir = path.join(frontendDir, 'components');
  const componentNames = listDirNames(componentsDir);
  const nestedComponentDirs: string[] = [];
  for (const top of componentNames) {
    const sub = listDirNames(path.join(componentsDir, top));
    if (sub.length > 0) { for (const s of sub) nestedComponentDirs.push(`${top}/${s}`); }
    else nestedComponentDirs.push(top);
  }
  const componentDetails = nestedComponentDirs.map(rel => {
    const dir = path.join(componentsDir, rel);
    return { name: rel, lines: countLines(dir, ['.tsx', '.ts', '.css']), files: countFiles(dir, ['.tsx', '.ts', '.css']), hasTest: countFiles(dir, ['.test.tsx', '.test.ts']) > 0, hasStory: countFiles(dir, ['.stories.tsx']) > 0, hasCss: countFiles(dir, ['.css']) > 0 };
  }).sort((a, b) => b.lines - a.lines);

  // Hooks, contexts, routes, middleware, socket, utils
  const hooksDir = path.join(frontendDir, 'hooks');
  const hookDetails = collectFiles(hooksDir, ['.ts']).filter(f => !f.name.endsWith('.test.ts')).map(f => ({ name: f.name.replace('.ts', ''), lines: f.lines })).sort((a, b) => b.lines - a.lines);
  const contextsDir = path.join(frontendDir, 'contexts');
  const contextDetails = collectFiles(contextsDir, ['.tsx', '.ts']).filter(f => !f.name.includes('.test.')).map(f => ({ name: f.name.replace(/\.(tsx|ts)$/, ''), lines: f.lines })).sort((a, b) => b.lines - a.lines);
  const routesDir = path.join(backendDir, 'routes');
  const routeDetails = collectFiles(routesDir, ['.ts']).map(f => ({ name: f.name.replace('.ts', ''), lines: f.lines })).sort((a, b) => b.lines - a.lines);
  const middlewareDir = path.join(backendDir, 'middleware');
  const middlewareFiles = collectFiles(middlewareDir, ['.ts']).map(f => ({ name: f.name.replace('.ts', ''), lines: f.lines }));
  const socketDir = path.join(backendDir, 'socket');
  const socketLines = countLines(socketDir, ['.ts']);
  const socketFiles = collectFiles(socketDir, ['.ts']).map(f => ({ name: f.name.replace('.ts', ''), lines: f.lines }));
  const feUtilFiles = collectFiles(path.join(frontendDir, 'utils'), ['.ts', '.tsx']).filter(f => !f.name.includes('.test.')).map(f => ({ name: f.name.replace(/\.(tsx|ts)$/, ''), lines: f.lines }));
  const beLibFiles = collectFiles(path.join(backendDir, 'lib'), ['.ts']).filter(f => !f.name.includes('.test.')).map(f => ({ name: f.name.replace('.ts', ''), lines: f.lines }));

  // Pages, prisma, migrations
  const appDir = path.join(frontendDir, 'app');
  const pageNames = listDirNames(appDir).filter(n => n !== 'api');
  const prismaModels = parsePrismaModels();
  const migrationDir = path.join(ROOT, 'backend/prisma/migrations');
  let migrationCount = 0;
  try { migrationCount = fs.readdirSync(migrationDir).filter(d => d.match(/^\d/)).length; } catch { /* */ }

  // Dependencies & scripts
  const rootDeps = readPkgDeps(path.join(ROOT, 'package.json'));
  const frontendDeps = readPkgDeps(path.join(ROOT, 'frontend/package.json'));
  const backendDeps = readPkgDeps(path.join(ROOT, 'backend/package.json'));
  const scripts = {
    root: readPkgScripts(path.join(ROOT, 'package.json')),
    frontend: readPkgScripts(path.join(ROOT, 'frontend/package.json')),
    backend: readPkgScripts(path.join(ROOT, 'backend/package.json')),
  };

  // Largest files
  const allFiles: { path: string; lines: number }[] = [];
  walk(frontendDir, ['.ts', '.tsx', '.css'], (fp, _n, l) => allFiles.push({ path: fp.replace(ROOT + '/', ''), lines: l }));
  walk(backendDir, ['.ts'], (fp, _n, l) => allFiles.push({ path: fp.replace(ROOT + '/', ''), lines: l }));
  walk(widgetDir, ['.js'], (fp, _n, l) => allFiles.push({ path: fp.replace(ROOT + '/', ''), lines: l }));
  const largestFiles = allFiles.sort((a, b) => b.lines - a.lines).slice(0, 20);

  // TODOs
  const todos = [...scanTodos(frontendDir, ['.ts', '.tsx']), ...scanTodos(backendDir, ['.ts']), ...scanTodos(widgetDir, ['.js'])];

  // Recently modified
  const recentlyModifiedRaw = git('log --format="" --name-only -20 --no-merges --diff-filter=M');
  const seenRecent = new Set<string>();
  const recentlyModified: string[] = [];
  if (recentlyModifiedRaw) {
    for (const f of recentlyModifiedRaw.split('\n')) {
      const t = f.trim();
      if (t && !seenRecent.has(t) && !t.includes('node_modules')) { seenRecent.add(t); recentlyModified.push(t); if (recentlyModified.length >= 15) break; }
    }
  }

  // Express endpoints inventory
  const endpoints = scanEndpoints(routesDir);

  // Socket events inventory
  const socketEvents = scanSocketEvents(socketDir);

  // Environment info
  const env = {
    nodeVersion: run('node --version'),
    npmVersion: run('npm --version'),
    gitVersion: run('git --version').replace('git version ', ''),
    os: `${process.platform} ${process.arch}`,
    nextVersion: '',
    prismaVersion: '',
    typescriptVersion: '',
  };
  try { env.nextVersion = JSON.parse(fs.readFileSync(path.join(ROOT, 'frontend/node_modules/next/package.json'), 'utf8')).version; } catch { /* */ }
  try { env.prismaVersion = JSON.parse(fs.readFileSync(path.join(ROOT, 'backend/node_modules/@prisma/client/package.json'), 'utf8')).version; } catch { /* */ }
  try { env.typescriptVersion = JSON.parse(fs.readFileSync(path.join(ROOT, 'frontend/node_modules/typescript/package.json'), 'utf8')).version; } catch { /* */ }

  // Health
  const totalSourceFiles = tsFiles + cssFiles + jsFiles + shellFiles;
  const totalLoc = tsLines + cssLines + jsLines + shellLines;
  const avgFileSize = totalSourceFiles > 0 ? Math.round(totalLoc / totalSourceFiles) : 0;
  const testRatio = totalSourceFiles > 0 ? +(testFileTotal / totalSourceFiles * 100).toFixed(1) : 0;
  const componentsWithTests = componentDetails.filter(c => c.hasTest).length;
  const testCoverage = componentDetails.length > 0 ? +(componentsWithTests / componentDetails.length * 100).toFixed(1) : 0;
  const commitsPerDay = dailyCommits.length > 0 ? +(totalCommits / dailyCommits.length).toFixed(1) : 0;
  const componentCount = countFiles(componentsDir, ['.tsx']);

  // ── New metrics ──────────────────────────────────────────────────────────

  // Code Churn — most frequently changed files
  const churnRaw = git('log --format="" --name-only --no-merges');
  const churnMap: Record<string, number> = {};
  if (churnRaw) {
    for (const line of churnRaw.split('\n')) {
      const f = line.trim();
      if (f && !f.includes('node_modules') && !f.includes('.next') && !f.endsWith('version.ts')) {
        churnMap[f] = (churnMap[f] || 0) + 1;
      }
    }
  }
  const codeChurn = Object.entries(churnMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([file, changes]) => ({ file, changes }));

  // Commit Streaks — current and longest consecutive-day streaks
  let currentStreak = 0;
  let longestStreak = 0;
  const sortedDays = Object.keys(dailyMap).sort();
  if (sortedDays.length > 0) {
    // Longest streak
    let streak = 1;
    for (let i = 1; i < sortedDays.length; i++) {
      const prev = new Date(sortedDays[i - 1]);
      const curr = new Date(sortedDays[i]);
      if ((curr.getTime() - prev.getTime()) / 86400000 === 1) { streak++; }
      else { longestStreak = Math.max(longestStreak, streak); streak = 1; }
    }
    longestStreak = Math.max(longestStreak, streak);

    // Current streak (counting back from today)
    const todayStr = today.toISOString().substring(0, 10);
    let d = new Date(todayStr);
    if (!dailyMap[todayStr]) { d.setDate(d.getDate() - 1); }
    while (dailyMap[d.toISOString().substring(0, 10)]) {
      currentStreak++;
      d.setDate(d.getDate() - 1);
    }
  }

  // Lines Added vs Deleted
  const shortstatRaw = git('log --shortstat --no-merges --format=""');
  let linesAdded = 0;
  let linesDeleted = 0;
  if (shortstatRaw) {
    for (const line of shortstatRaw.split('\n')) {
      const addMatch = line.match(/(\d+) insertion/);
      const delMatch = line.match(/(\d+) deletion/);
      if (addMatch) linesAdded += parseInt(addMatch[1], 10);
      if (delMatch) linesDeleted += parseInt(delMatch[1], 10);
    }
  }

  // Code Ownership — lines added per author
  const ownershipRaw = git('log --format="AUTHOR:%aN" --numstat --no-merges');
  const ownershipMap: Record<string, { added: number; deleted: number }> = {};
  let currentAuthor = '';
  if (ownershipRaw) {
    for (const line of ownershipRaw.split('\n')) {
      if (line.startsWith('AUTHOR:')) {
        currentAuthor = line.substring(7);
        if (!ownershipMap[currentAuthor]) ownershipMap[currentAuthor] = { added: 0, deleted: 0 };
      } else {
        const parts = line.trim().split('\t');
        if (parts.length >= 3 && currentAuthor) {
          const a = parseInt(parts[0], 10);
          const d2 = parseInt(parts[1], 10);
          if (!isNaN(a)) ownershipMap[currentAuthor].added += a;
          if (!isNaN(d2)) ownershipMap[currentAuthor].deleted += d2;
        }
      }
    }
  }
  const codeOwnership = Object.entries(ownershipMap)
    .map(([author, stats]) => ({ author, added: stats.added, deleted: stats.deleted, net: stats.added - stats.deleted }))
    .sort(/* istanbul ignore next */ (a, b) => b.net - a.net);

  // Branch and Tag count
  const branchesRaw = git('branch -a');
  const branchCount = branchesRaw ? branchesRaw.split('\n').filter(l => l.trim()).length : 0;
  const tagsRaw = git('tag');
  const tagCount = tagsRaw ? tagsRaw.split('\n').filter(l => l.trim()).length : 0;

  // Bundle size (.next build output)
  let bundleSizeBytes = 0;
  const nextDir = path.join(ROOT, 'frontend/.next');
  try {
    if (fs.existsSync(nextDir)) {
      const duOut = run(`du -sk "${nextDir}"`);
      bundleSizeBytes = parseInt(duOut.split('\t')[0] || '0', 10) * 1024;
    }
  } catch { /* */ }

  // ── Dependency vulnerabilities (npm audit) ────────────────────────────
  type VulnDetail = { name: string; severity: string; via: string; fixAvailable: boolean };
  type AuditSummary = { critical: number; high: number; moderate: number; low: number; info: number; total: number; details: VulnDetail[] };
  /* istanbul ignore next -- skipped in test mode */
  function npmAudit(dir: string): AuditSummary {
    const empty: AuditSummary = { critical: 0, high: 0, moderate: 0, low: 0, info: 0, total: 0, details: [] };
    function parse(json: any): AuditSummary {
      const v = json.metadata?.vulnerabilities || {};
      const details: VulnDetail[] = [];
      const vulns = json.vulnerabilities || {};
      for (const [name, info] of Object.entries(vulns) as [string, any][]) {
        const via = (info.via || []).map((v: any) => typeof v === 'string' ? v : v.title || v.name || '').filter(Boolean).join(', ');
        details.push({ name, severity: info.severity || 'info', via, fixAvailable: !!info.fixAvailable });
      }
      details.sort((a, b) => {
        const order: Record<string, number> = { critical: 0, high: 1, moderate: 2, low: 3, info: 4 };
        return (order[a.severity] ?? 5) - (order[b.severity] ?? 5);
      });
      return { critical: v.critical || 0, high: v.high || 0, moderate: v.moderate || 0, low: v.low || 0, info: v.info || 0, total: v.total || 0, details };
    }
    try {
      const raw = execSync('npm audit --json 2>/dev/null', { cwd: dir, timeout: 15_000, encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 });
      return parse(JSON.parse(raw));
    } catch (err: any) {
      try { return parse(JSON.parse(err.stdout || '{}')); } catch { return empty; }
    }
  }
  const isTest = process.env.NODE_ENV === 'test';
  const auditEmpty: AuditSummary = { critical: 0, high: 0, moderate: 0, low: 0, info: 0, total: 0, details: [] };
  const auditFrontend = isTest ? auditEmpty : npmAudit(path.join(ROOT, 'frontend'));
  const auditBackend = isTest ? auditEmpty : npmAudit(path.join(ROOT, 'backend'));

  // ── Build health (TypeScript compilation check) ──────────────────────
  type BuildCheck = { area: string; ok: boolean; errors: number; errorSample: string[] };
  /* istanbul ignore next -- skipped in test mode */
  function tscCheck(dir: string, area: string): BuildCheck {
    try {
      execSync('npx tsc --noEmit 2>&1', { cwd: dir, timeout: 30_000, encoding: 'utf8' });
      return { area, ok: true, errors: 0, errorSample: [] };
    } catch (err: any) {
      const out: string = err.stdout || err.stderr || '';
      const errLines = out.split('\n').filter((l: string) => l.includes('error TS'));
      return { area, ok: false, errors: errLines.length, errorSample: errLines.slice(0, 10) };
    }
  }
  const buildChecks = isTest
    ? [{ area: 'backend', ok: true, errors: 0, errorSample: [] }, { area: 'frontend', ok: true, errors: 0, errorSample: [] }]
    : [tscCheck(path.join(ROOT, 'backend'), 'backend'), tscCheck(path.join(ROOT, 'frontend'), 'frontend')];

  // ── Git branches with staleness ──────────────────────────────────────
  type BranchInfo = { name: string; lastCommit: string; author: string; daysAgo: number; isCurrent: boolean };
  const branches: BranchInfo[] = [];
  try {
    const branchDetail = git('for-each-ref --sort=-committerdate refs/heads/ --format="%(refname:short)|%(committerdate:iso)|%(authorname)"');
    const currentBranchName = git('rev-parse --abbrev-ref HEAD');
    if (branchDetail) {
      for (const line of branchDetail.split('\n').filter(l => l.trim())) {
        const [name, dateStr, author] = line.split('|');
        const d = new Date(dateStr);
        const daysAgo = Math.floor((Date.now() - d.getTime()) / 86_400_000);
        branches.push({ name, lastCommit: dateStr.substring(0, 10), author, daysAgo, isCurrent: name === currentBranchName });
      }
    }
  } catch { /* */ }

  // ── Prisma migration status ──────────────────────────────────────────
  type MigrationStatus = { applied: number; pending: number; migrations: { name: string; applied: boolean }[] };
  let migrationStatus: MigrationStatus = { applied: 0, pending: 0, migrations: [] };
  try {
    const migrationsDir = path.join(ROOT, 'backend/prisma/migrations');
    if (fs.existsSync(migrationsDir)) {
      const migDirs = fs.readdirSync(migrationsDir, { withFileTypes: true })
        .filter(d => d.isDirectory() && d.name !== 'migration_lock.toml')
        .map(d => d.name)
        .sort()
        .reverse();
      const appliedMigrations = new Set<string>();
      if (isTest) {
        migDirs.forEach(m => appliedMigrations.add(m));
      } else /* istanbul ignore next -- skipped in test mode */ {
        try {
          const statusRaw = execSync('npx prisma migrate status 2>&1', {
            cwd: path.join(ROOT, 'backend'), timeout: 15_000, encoding: 'utf8',
          });
          if (statusRaw.includes('up to date') || statusRaw.includes('have been applied')) {
            migDirs.forEach(m => appliedMigrations.add(m));
          } else if (statusRaw.includes('not yet been applied')) {
            const notAppliedRe = /Following migration.*not yet been applied[\s\S]*$/i;
            const notAppliedBlock = statusRaw.match(notAppliedRe)?.[0] || '';
            migDirs.forEach(m => {
              if (!notAppliedBlock.includes(m)) appliedMigrations.add(m);
            });
          } else {
            migDirs.forEach(m => appliedMigrations.add(m));
          }
        } catch { migDirs.forEach(m => appliedMigrations.add(m)); }
      }

      migrationStatus = {
        applied: appliedMigrations.size,
        pending: migDirs.length - appliedMigrations.size,
        migrations: migDirs.map(m => ({ name: m, applied: appliedMigrations.has(m) })),
      };
    }
  } catch { /* */ }

  // ── API documentation completeness ───────────────────────────────────
  type DocCoverage = { total: number; documented: number; undocumented: string[] };
  const apiDocCoverage: DocCoverage = { total: 0, documented: 0, undocumented: [] };
  {
    const routesDir = path.join(ROOT, 'backend/src/routes');
    const handlerRe = /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)/gi;
    try {
      for (const f of fs.readdirSync(routesDir)) {
        if (!f.endsWith('.ts')) continue;
        const content = fs.readFileSync(path.join(routesDir, f), 'utf8');
        const lines = content.split('\n');
        let m;
        while ((m = handlerRe.exec(content)) !== null) {
          apiDocCoverage.total++;
          const lineIdx = content.substring(0, m.index).split('\n').length - 1;
          let documented = false;
          for (let i = lineIdx - 1; i >= Math.max(0, lineIdx - 60); i--) {
            const trimmed = lines[i].trim();
            if (trimmed === '' || trimmed.startsWith('*') || trimmed === '*/') continue;
            if (trimmed.startsWith('/**') || trimmed.startsWith('//')) { documented = true; break; }
            break;
          }
          if (documented) { apiDocCoverage.documented++; } else {
            apiDocCoverage.undocumented.push(`${m[1].toUpperCase()} ${m[2]} (${f})`);
          }
        }
        handlerRe.lastIndex = 0;
      }
    } catch { /* */ }
  }

  // Frontend test coverage — which source modules have matching test files
  type FrontendModule = { name: string; category: string; lines: number; hasTest: boolean };
  const frontendModules: FrontendModule[] = [];

  // Components (already have hasTest from componentDetails)
  for (const c of componentDetails) {
    frontendModules.push({ name: c.name, category: 'component', lines: c.lines, hasTest: c.hasTest });
  }

  // Hooks — check for .test.ts sibling
  for (const h of hookDetails) {
    const testPath = path.join(hooksDir, `${h.name}.test.ts`);
    const hasTest = fs.existsSync(testPath);
    frontendModules.push({ name: h.name, category: 'hook', lines: h.lines, hasTest });
  }

  // Contexts — check for .test.tsx / .test.ts sibling
  for (const c of contextDetails) {
    const hasTest = fs.existsSync(path.join(contextsDir, `${c.name}.test.tsx`)) || fs.existsSync(path.join(contextsDir, `${c.name}.test.ts`));
    frontendModules.push({ name: c.name, category: 'context', lines: c.lines, hasTest });
  }

  // Utils — check for .test.ts sibling
  const feUtilsDir = path.join(frontendDir, 'utils');
  for (const u of feUtilFiles) {
    const hasTest = fs.existsSync(path.join(feUtilsDir, `${u.name}.test.ts`)) || fs.existsSync(path.join(feUtilsDir, `${u.name}.test.tsx`));
    frontendModules.push({ name: u.name, category: 'util', lines: u.lines, hasTest });
  }

  // Pages — check for test files inside each page directory
  for (const p of pageNames) {
    const pageDir = path.join(appDir, p);
    const pageLines = countLines(pageDir, ['.tsx', '.ts', '.css']);
    const hasTest = countFiles(pageDir, ['.test.tsx', '.test.ts'], false) > 0;
    frontendModules.push({ name: p, category: 'page', lines: pageLines, hasTest });
  }

  // Widget — scan widget-src .js files (excluding build tooling)
  const widgetTestDir = path.join(widgetDir, '__tests__');
  const widgetTestNames = new Set<string>();
  try {
    for (const f of fs.readdirSync(widgetTestDir)) {
      if (f.endsWith('.test.js')) widgetTestNames.add(f.replace('.test.js', ''));
    }
  } catch { /* */ }
  const SKIP_WIDGET = new Set(['build', 'jest.config']);
  const widgetFiles = collectFiles(widgetDir, ['.js'])
    .filter(f => !f.name.includes('.test.') && !SKIP_WIDGET.has(f.name.replace('.js', '')));
  for (const w of widgetFiles) {
    const baseName = w.name.replace('.js', '');
    frontendModules.push({ name: baseName, category: 'widget', lines: w.lines, hasTest: widgetTestNames.has(baseName) || widgetTestNames.has('widget') });
  }

  const frontendTestedCount = frontendModules.filter(m => m.hasTest).length;
  const frontendUntestedModules = frontendModules.filter(m => !m.hasTest);

  // Backend test coverage — which source modules have matching test files
  const beTestDir = path.join(backendDir, '__tests__');
  const beTestNames = new Set<string>();
  try {
    for (const f of fs.readdirSync(beTestDir)) {
      if (f.endsWith('.test.ts')) beTestNames.add(f.replace('.test.ts', ''));
    }
  } catch { /* */ }

  type BackendModule = { name: string; category: string; lines: number; hasTest: boolean };
  const backendModules: BackendModule[] = [];

  const addModules = (items: { name: string; lines: number }[], category: string) => {
    for (const item of items) {
      backendModules.push({ name: item.name, category, lines: item.lines, hasTest: beTestNames.has(item.name) });
    }
  };

  addModules(routeDetails, 'route');
  addModules(middlewareFiles, 'middleware');
  addModules(beLibFiles, 'lib');

  const beServicesDir = path.join(backendDir, 'services');
  const SKIP_SERVICE_MODULES = new Set(['logo-base64-constant']);
  const serviceFiles = collectFiles(beServicesDir, ['.ts'])
    .filter(f => !f.name.includes('.test.') && !SKIP_SERVICE_MODULES.has(f.name.replace('.ts', '')))
    .map(f => ({ name: f.name.replace('.ts', ''), lines: f.lines }));
  addModules(serviceFiles, 'service');
  addModules(socketFiles, 'socket');

  const backendTestedCount = backendModules.filter(m => m.hasTest).length;
  const backendUntestedModules = backendModules.filter(m => !m.hasTest);

  // Prisma schema complexity (totals)
  const prismaComplexity = {
    totalModels: prismaModels.length,
    totalFields: prismaModels.reduce((s, m) => s + m.fields, 0),
    totalRelations: prismaModels.reduce((s, m) => s + m.relations, 0),
    avgFieldsPerModel: prismaModels.length > 0 ? +(prismaModels.reduce((s, m) => s + m.fields, 0) / prismaModels.length).toFixed(1) : 0,
  };

  // Stale files — source files whose last commit is oldest
  const fileLastCommit: Record<string, string> = {};
  if (churnRaw) {
    let commitDate = '';
    const logWithDates = git('log --format="DATE:%aI" --name-only --no-merges');
    if (logWithDates) {
      for (const line of logWithDates.split('\n')) {
        if (line.startsWith('DATE:')) {
          commitDate = line.substring(5, 15);
        } else {
          const f = line.trim();
          if (f && !f.includes('node_modules') && !f.includes('.next') && !fileLastCommit[f]) {
            fileLastCommit[f] = commitDate;
          }
        }
      }
    }
  }
  const staleFiles = Object.entries(fileLastCommit)
    .filter(([f]) => (f.startsWith('frontend/src/') || f.startsWith('backend/src/') || f.startsWith('widget-src/')) &&
      (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.css') || f.endsWith('.js')))
    .sort((a, b) => a[1].localeCompare(b[1]))
    .slice(0, 15)
    .map(([file, lastModified]) => ({ file, lastModified }));

  return {
    generatedAt: new Date().toISOString(),
    overview: {
      totalCommits, totalLines: totalLoc, totalFiles: totalSourceFiles, testFiles: testFileTotal,
      firstCommitDate, latestCommitDate, currentBranch, latestHash, latestMessage,
      daysActive: firstCommitDate && latestCommitDate ? Math.ceil((new Date(latestCommitDate).getTime() - new Date(firstCommitDate).getTime()) / 86400000) + 1 : 0,
    },
    loc: { typescript: tsLines, css: cssLines, javascript: jsLines, shell: shellLines },
    locByArea: { frontend: feLines, backend: beLines, widget: wLines, shell: shellLines },
    files: { typescript: tsFiles, css: cssFiles, javascript: jsFiles, shell: shellFiles },
    fileTypes: { tsx: tsxFiles, ts: pureTs, moduleCss, plainCss, js: jsFiles, sh: shellFiles },
    testBreakdown: { frontend: feTestFiles, backend: beTestFiles, widget: widgetTestFiles },
    architecture: {
      components: componentCount, hooks: hookDetails.length, apiRoutes: routeDetails.length,
      contexts: contextDetails.length, pages: pageNames.length, dbModels: prismaModels.length,
      dbMigrations: migrationCount, socketHandlerLines: socketLines,
      middleware: middlewareFiles.length, utils: feUtilFiles.length + beLibFiles.length,
    },
    health: { avgFileSize, testRatio, testCoverage, commitsPerDay, largestFile: largestFiles[0] || null },
    commitStats: { avgMsgLength, topWords },
    env,
    contributors,
    activityByHour: hourMap,
    activityByDay: dayMap,
    heatmap,
    components: componentDetails,
    hooks: hookDetails,
    contexts: contextDetails,
    routes: routeDetails,
    middleware: middlewareFiles,
    socketHandlers: socketFiles,
    socketEvents,
    endpoints,
    utils: feUtilFiles,
    backendLib: beLibFiles,
    pages: pageNames,
    prismaModels,
    prismaComplexity,
    scripts,
    dependencies: {
      root: rootDeps, frontend: frontendDeps, backend: backendDeps,
      total: rootDeps.prod + rootDeps.dev + frontendDeps.prod + frontendDeps.dev + backendDeps.prod + backendDeps.dev,
    },
    largestFiles, todos, recentlyModified, dailyCommits, weeklyCommits, recentCommits,
    codeChurn,
    commitStreaks: { current: currentStreak, longest: longestStreak },
    linesChanged: { added: linesAdded, deleted: linesDeleted, net: linesAdded - linesDeleted },
    commitTypes,
    commitSizeDistribution: sizeBuckets,
    commitSizeStats: { avgSize: avgCommitSize, avgFiles: avgFilesPerCommit },
    weeklyVelocity: weeklyVelocityArr,
    biggestCommits,
    codeOwnership,
    branchCount,
    tagCount,
    bundleSizeBytes,
    staleFiles,
    backendModules,
    backendTestedCount,
    backendUntestedModules,
    frontendModules,
    frontendTestedCount,
    frontendUntestedModules,
    audit: { frontend: auditFrontend, backend: auditBackend },
    buildChecks,
    branches,
    migrationStatus,
    apiDocCoverage,
  };
}

// ---------------------------------------------------------------------------
// Test results helpers
// ---------------------------------------------------------------------------

interface TestResult {
  name: string;
  status: 'passed' | 'failed';
  duration: number;
  retries?: number;
  project?: string;
}

interface TestSuite {
  file: string;
  status: 'passed' | 'failed';
  tests: TestResult[];
  duration: number;
}

interface TestReport {
  generatedAt: string;
  summary: { total: number; passed: number; failed: number; flaky: number; suites: number; duration: number; elapsed?: number };
  suites: TestSuite[];
  coverage: { statements: number; branches: number; functions: number; lines: number } | null;
}

const testCache: Record<string, { data: TestReport; ts: number }> = {};
const TEST_CACHE_TTL = 300_000;

// Pre-load persisted test reports into memory at startup
if (process.env.NODE_ENV !== 'test') {
  for (const area of ['backend', 'frontend', 'e2e']) {
    try {
      const p = path.join(ROOT, '.test-cache', `${area}.json`);
      if (fs.existsSync(p)) {
        const report = JSON.parse(fs.readFileSync(p, 'utf8')) as TestReport;
        testCache[`tests_${area}`] = { data: report, ts: Date.now() };
      }
    } catch { /* ignore corrupt files */ }
  }
  // Load dashboard metrics from disk cache for instant first request
  const diskCache = loadDashCache();
  if (diskCache) cache = { data: diskCache.data, ts: Date.now() };
}

// ---------------------------------------------------------------------------
// Live test run tracking — enables real-time streaming of results
// ---------------------------------------------------------------------------

interface LiveTestResult {
  name: string;
  suite: string;
  project?: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  timestamp: number;
  retries?: number;
}

interface LiveRun {
  status: 'running' | 'done' | 'error';
  startedAt: number;
  results: LiveTestResult[];
  finalReport?: TestReport;
  error?: string;
  pid?: number;
}

const liveRuns: Record<string, LiveRun> = {};

function saveRunState(key: string, status: 'running' | 'done' | 'error', pid?: number) {
  try {
    fs.mkdirSync(path.dirname(RUN_STATE_PATH), { recursive: true });
    let state: Record<string, any> = {};
    try { state = JSON.parse(fs.readFileSync(RUN_STATE_PATH, 'utf8')); } catch { /* new file */ }
    state[key] = { status, pid: pid || null, ts: Date.now() };
    if (status !== 'running') delete state[key];
    fs.writeFileSync(RUN_STATE_PATH, JSON.stringify(state));
  } catch { /* ignore */ }
}

function loadRunState(key: string): { status: string; pid: number | null; ts: number } | null {
  try {
    const state = JSON.parse(fs.readFileSync(RUN_STATE_PATH, 'utf8'));
    return state[key] || null;
  } catch { return null; }
}

function isProcessAlive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

const INFRA_PROJECTS = new Set(['setup', 'teardown']);

function parsePlaywrightLine(line: string): LiveTestResult | null {
  const m = line.match(/^\s*([✓✔✘×✗↻·\-])\s+\d+\s+(?:\[(\w+)\]\s+›\s+)?(\S+?)(?::\d+:\d+)?\s+›\s+(.+?)\s+\((.+?)\)\s*$/);
  if (!m) return null;
  const [, icon, project, file, rawName, dur] = m;
  if (INFRA_PROJECTS.has((project || '').toLowerCase())) return null;
  const name = rawName.replace(/\s*\(retry #\d+\)\s*$/, '').replace(/\s›\s/g, ' > ').trim();
  const isRetry = icon === '↻' || /retry #\d+/.test(rawName);
  const status = (icon === '✓' || icon === '✔') ? 'passed' : (icon === '-' || icon === '·') ? 'skipped' : 'failed';
  const durClean = dur.replace(/retry #\d+/g, '').trim();
  const ms = durClean.endsWith('ms') ? parseInt(durClean) : durClean.endsWith('s') ? Math.round(parseFloat(durClean) * 1000) : parseInt(durClean);
  return { name, suite: file, project: project || undefined, status, duration: isNaN(ms) ? 0 : ms, timestamp: Date.now(), retries: isRetry ? 1 : 0 };
}

function parseJestLine(line: string, currentSuite: string): { result?: LiveTestResult; newSuite?: string } {
  const suiteMatch = line.match(/^\s*(PASS|FAIL)\s+(.+?)(?:\s+\([\d.]+\s*s?\))?\s*$/);
  if (suiteMatch) return { newSuite: suiteMatch[2].trim() };

  const testMatch = line.match(/^\s*([✓√✕✗×○●])\s+(.+?)(?:\s+\((\d+)\s*ms\))?\s*$/);
  if (testMatch) {
    const [, icon, name, durStr] = testMatch;
    const status = (icon === '✓' || icon === '√') ? 'passed' : (icon === '○' || icon === '●') ? 'skipped' : 'failed';
    return { result: { name: name.trim(), suite: currentSuite, status, duration: durStr ? parseInt(durStr) : 0, timestamp: Date.now() } };
  }

  return {};
}

function buildReportFromLive(results: LiveTestResult[]): TestReport {
  const suiteMap = new Map<string, TestSuite>();
  for (const r of results) {
    if (!suiteMap.has(r.suite)) {
      suiteMap.set(r.suite, { file: r.suite, status: 'passed', duration: 0, tests: [] });
    }
    const suite = suiteMap.get(r.suite)!;
    if (r.status === 'skipped') continue;
    suite.tests.push({ name: r.name, status: r.status === 'passed' ? 'passed' : 'failed', duration: r.duration, retries: r.retries || 0, project: r.project });
    suite.duration += r.duration;
    if (r.status === 'failed') suite.status = 'failed';
  }
  const suites = Array.from(suiteMap.values());
  let total = 0, passed = 0, failed = 0, flaky = 0, totalDuration = 0;
  for (const s of suites) {
    for (const t of s.tests) {
      total++;
      if (t.status === 'passed') passed++; else failed++;
      if ((t.retries || 0) > 0) flaky++;
    }
    totalDuration += s.duration;
  }
  return {
    generatedAt: new Date().toISOString(),
    summary: { total, passed, failed, flaky, suites: suites.length, duration: totalDuration },
    suites,
    coverage: null,
  };
}

function mergeReports(base: TestReport, partial: TestReport): TestReport {
  const merged = JSON.parse(JSON.stringify(base)) as TestReport;
  for (const newSuite of partial.suites) {
    const existingSuite = merged.suites.find(s => s.file === newSuite.file);
    if (existingSuite) {
      for (const newTest of newSuite.tests) {
        const existingTest = existingSuite.tests.find(t => t.name === newTest.name && (t.project || '') === (newTest.project || ''));
        if (existingTest) {
          existingTest.status = newTest.status;
          existingTest.duration = newTest.duration;
          existingTest.retries = (existingTest.retries || 0) + 1;
        } else {
          existingSuite.tests.push(newTest);
        }
      }
      existingSuite.status = existingSuite.tests.some(t => t.status === 'failed') ? 'failed' : 'passed';
      existingSuite.duration = existingSuite.tests.reduce((s, t) => s + t.duration, 0);
    } else {
      merged.suites.push(newSuite);
    }
  }
  let total = 0, passed = 0, failed = 0, flaky = 0, totalDuration = 0;
  for (const s of merged.suites) {
    for (const t of s.tests) {
      total++;
      if (t.status === 'passed') passed++; else failed++;
      if ((t.retries || 0) > 0) flaky++;
    }
    totalDuration += s.duration;
  }
  merged.summary = { total, passed, failed, flaky, suites: merged.suites.length, duration: totalDuration, elapsed: partial.summary.elapsed };
  merged.generatedAt = new Date().toISOString();
  if (partial.coverage) merged.coverage = partial.coverage;
  return merged;
}

function readCoverage(dir: string): TestReport['coverage'] {
  try {
    const covPath = path.join(dir, 'coverage', 'coverage-summary.json');
    if (!fs.existsSync(covPath)) return null;
    const totals = JSON.parse(fs.readFileSync(covPath, 'utf8')).total;
    return {
      statements: totals.statements?.pct ?? 0,
      branches: totals.branches?.pct ?? 0,
      functions: totals.functions?.pct ?? 0,
      lines: totals.lines?.pct ?? 0,
    };
  } catch { return null; }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

let rebuilding = false;

function backgroundRebuild() {
  if (rebuilding) return;
  rebuilding = true;
  setTimeout(() => {
    try {
      const data = buildDashboard();
      cache = { data, ts: Date.now() };
      saveDashCache(data);
      console.log('Dashboard cache rebuilt in background');
    } catch (err) {
      console.error('Background dashboard rebuild failed:', err);
    } finally {
      rebuilding = false;
    }
  }, 0);
}

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: Full project dashboard metrics
 *     description: >
 *       Returns 60+ real-time metrics computed from the Git history,
 *       source tree, Prisma schema, dependency manifests, and more.
 *       Results are cached server-side; stale caches are rebuilt in
 *       the background so requests never block for long.
 *     tags: [Dashboard]
 *     security: []
 *     responses:
 *       200:
 *         description: Dashboard payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 generatedAt:
 *                   type: string
 *                   format: date-time
 *                 overview:
 *                   type: object
 *                   description: High-level project stats (commits, lines, files, branch, dates)
 *                 loc:
 *                   type: object
 *                   description: Lines of code by language
 *                 architecture:
 *                   type: object
 *                   description: Component, hook, route, context, and model counts
 *                 health:
 *                   type: object
 *                   description: Code-health gauges (test ratio, avg file size, commits/day)
 *                 contributors:
 *                   type: array
 *                   items:
 *                     type: object
 *                 dailyCommits:
 *                   type: array
 *                   items:
 *                     type: object
 *                 dependencies:
 *                   type: object
 *                   description: Dependency counts per workspace
 *       500:
 *         description: Failed to generate dashboard data
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    if (cache) {
      const stale = Date.now() - cache.ts >= CACHE_TTL;
      if (stale) backgroundRebuild();
      return res.json(cache.data);
    }
    // No cache at all — must block (first ever request)
    const data = buildDashboard();
    cache = { data, ts: Date.now() };
    saveDashCache(data);
    res.json(data);
  } catch (err) {
    /* istanbul ignore next */
    console.error('Dashboard error:', err);
    /* istanbul ignore next */
    res.status(500).json({ error: 'Failed to generate dashboard data' });
  }
});

/** POST /invalidate — Rebuild the dashboard cache (called by manual refresh) */
router.post('/invalidate', (_req: Request, res: Response) => {
  try {
    const data = buildDashboard();
    cache = { data, ts: Date.now() };
    saveDashCache(data);
    res.json({ ok: true });
  } catch {
    /* istanbul ignore next */
    res.json({ ok: false });
  }
});

const E2E_JSON_PATH = path.join(ROOT, 'e2e-results.json');
const TEST_RESULTS_DIR = path.join(ROOT, '.test-cache');
function saveTestReport(area: string, report: TestReport, force = false) {
  try {
    fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
    const p = path.join(TEST_RESULTS_DIR, `${area}.json`);
    const newTotal = report.suites.reduce((s, su) => s + su.tests.length, 0);
    if (newTotal === 0) return;
    if (!force) {
      try {
        const existing = JSON.parse(fs.readFileSync(p, 'utf8')) as TestReport;
        const oldTotal = existing.suites.reduce((s, su) => s + su.tests.length, 0);
        if (newTotal < oldTotal * 0.5) return;
      } catch { /* no existing file, ok to write */ }
    }
    fs.writeFileSync(p, JSON.stringify(report));
  } catch { /* ignore */ }
}
function loadTestReport(area: string): TestReport | null {
  try {
    const p = path.join(TEST_RESULTS_DIR, `${area}.json`);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch { return null; }
}

/** GET /tests/e2e — Return live results while running, or final report */
router.get('/tests/e2e', (_req: Request, res: Response) => {
  try {
    // Crash recovery: if backend restarted but Playwright is still running
    if (!liveRuns.e2e) {
      const persisted = loadRunState('e2e');
      if (persisted?.status === 'running' && persisted.pid && isProcessAlive(persisted.pid)) {
        liveRuns.e2e = { status: 'running', startedAt: persisted.ts, results: [] };
      } else if (persisted?.status === 'running') {
        saveRunState('e2e', 'done');
      }
    }

    const run = liveRuns.e2e;

    if (run?.status === 'running') {
      const passed = run.results.filter(r => r.status === 'passed').length;
      const failed = run.results.filter(r => r.status === 'failed').length;
      const retrying = run.results.filter(r => (r.retries || 0) > 0).length;
      return res.json({
        status: 'running',
        startedAt: run.startedAt,
        elapsed: Date.now() - run.startedAt,
        liveResults: run.results,
        liveSummary: { completed: run.results.length, passed, failed, retrying },
      });
    }

    if (run?.status === 'error') {
      const err = run.error || 'Unknown error';
      delete liveRuns.e2e;
      return res.json({ status: 'error', error: err });
    }

    if (run?.status === 'done' && run.finalReport) {
      return res.json({ status: 'ready', ...run.finalReport });
    }

    // Fallback chain: disk cache → e2e-results.json → none
    const saved = loadTestReport('e2e');
    if (saved) return res.json({ status: 'ready', ...saved });

    if (fs.existsSync(E2E_JSON_PATH)) {
      const raw = fs.readFileSync(E2E_JSON_PATH, 'utf8');
      const report = parsePlaywrightJson(raw);
      if (report) {
        saveTestReport('e2e', report);
        return res.json({ status: 'ready', ...report });
      }
    }

    return res.json({ status: 'none' });
  } catch (err) {
    /* istanbul ignore next */
    console.error('E2E load error:', err);
    /* istanbul ignore next */
    res.status(500).json({ error: 'Failed to load E2E results' });
  }
});

/** POST /tests/e2e/run — Kick off an async E2E run with real-time result streaming */
router.post('/tests/e2e/run', (_req: Request, res: Response) => {
  if (requireTestPassword(_req, res)) return;
  if (liveRuns.e2e?.status === 'running') {
    return res.json({ status: 'running' });
  }

  const failedOnly = _req.body?.failedOnly === true;
  let grepPattern = '';
  if (failedOnly) {
    const prev = liveRuns.e2e?.finalReport || testCache.tests_e2e?.data || loadTestReport('e2e');
    if (prev) {
      const failedNames = prev.suites.flatMap((s: TestSuite) => s.tests.filter((t: TestResult) => t.status === 'failed').map((t: TestResult) => t.name));
      if (failedNames.length > 0) {
        // Use only the leaf test name (after the last ' > ') for --grep matching,
        // since Playwright uses Unicode › internally and stored names use ASCII >
        grepPattern = failedNames.map((n: string) => {
          const leaf = n.includes(' > ') ? n.substring(n.lastIndexOf(' > ') + 3) : n;
          return leaf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }).join('|');
      }
    }
    if (!grepPattern) {
      return res.json({ status: 'skipped', message: 'No failed tests to re-run' });
    }
  }

  const previousReport = failedOnly
    ? (liveRuns.e2e?.finalReport || testCache.tests_e2e?.data || loadTestReport('e2e'))
    : null;

  setTestMode(true);
  liveRuns.e2e = { status: 'running', startedAt: Date.now(), results: [] };

  const pwArgs = ['test'];
  if (grepPattern) pwArgs.push('--grep', grepPattern);

  console.log(`[E2E] Spawning: ${PW_BIN} ${pwArgs.join(' ')}`);

  let child: ReturnType<typeof spawn>;
  try {
    child = spawn(PW_BIN, pwArgs, {
      cwd: ROOT,
      env: { ...process.env, CI: 'true', SUPPRESS_SMS: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (spawnErr: any) {
    console.error(`[E2E] spawn threw:`, spawnErr.message);
    liveRuns.e2e.status = 'error';
    liveRuns.e2e.error = `Failed to spawn Playwright: ${spawnErr.message}`;
    saveRunState('e2e', 'error');
    return res.json({ status: 'error', error: liveRuns.e2e.error });
  }

  const childPid = child.pid;
  if (liveRuns.e2e) liveRuns.e2e.pid = childPid;
  saveRunState('e2e', 'running', childPid);

  let e2eLineBuf = '';
  let stderrBuf = '';
  (child.stdout as any)?.setEncoding?.('utf8');
  (child.stderr as any)?.setEncoding?.('utf8');

  const processE2eChunk = (chunk: string | Buffer) => {
    if (!liveRuns.e2e) return;
    const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    e2eLineBuf += text;
    const lines = e2eLineBuf.split('\n');
    e2eLineBuf = lines.pop() || '';
    for (const line of lines) {
      const result = parsePlaywrightLine(line);
      if (!result) continue;
      const existing = liveRuns.e2e.results.find(r => r.name === result.name && r.suite === result.suite && r.project === result.project);
      if (existing) {
        existing.retries = (existing.retries || 0) + 1;
        existing.status = result.status;
        existing.duration = result.duration;
        existing.timestamp = result.timestamp;
      } else {
        liveRuns.e2e.results.push(result);
      }
    }
  };

  child.stdout?.on('data', processE2eChunk);
  child.stderr?.on('data', (chunk: string | Buffer) => {
    const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    stderrBuf += text;
    processE2eChunk(chunk);
  });

  child.on('close', (code, signal) => {
    if (e2eLineBuf) processE2eChunk(e2eLineBuf + '\n');
    if (!liveRuns.e2e) {
      console.log(`[E2E] close: liveRuns.e2e gone (server restarted?) — code ${code} signal ${signal}`);
      return;
    }
    const wallClock = Date.now() - liveRuns.e2e.startedAt;

    let newReport: TestReport | null = null;
    if (fs.existsSync(E2E_JSON_PATH)) {
      try {
        newReport = parsePlaywrightJson(fs.readFileSync(E2E_JSON_PATH, 'utf8'));
      } catch { /* ignore */ }
    }
    if (!newReport && liveRuns.e2e.results.length > 0) {
      newReport = buildReportFromLive(liveRuns.e2e.results);
    }
    if (newReport && newReport.summary.total === 0) newReport = null;

    // No results from json or live parsing — likely a spawn/config failure
    if (!newReport && liveRuns.e2e.results.length === 0) {
      console.error(`[E2E] No results — code ${code} signal ${signal} (${Math.round(wallClock / 1000)}s)`);
      if (stderrBuf) console.error(`[E2E] stderr:\n${stderrBuf.slice(0, 2000)}`);
      liveRuns.e2e.status = 'error';
      liveRuns.e2e.error = stderrBuf
        ? `Playwright failed: ${stderrBuf.slice(0, 200)}`
        : `Playwright exited with code ${code ?? '?'} and no test results`;
      saveRunState('e2e', 'error');
      return;
    }

    if (newReport && !newReport.summary.elapsed) {
      newReport.summary.elapsed = wallClock;
    }
    if (failedOnly && previousReport && newReport) {
      liveRuns.e2e.finalReport = mergeReports(previousReport as TestReport, newReport);
    } else if (newReport) {
      liveRuns.e2e.finalReport = newReport;
    } else {
      const fallback = loadTestReport('e2e');
      if (fallback) liveRuns.e2e.finalReport = fallback;
    }
    if (liveRuns.e2e.finalReport) {
      saveTestReport('e2e', liveRuns.e2e.finalReport, true);
    }
    liveRuns.e2e.status = 'done';
    saveRunState('e2e', 'done');
    console.log(`[E2E] Finished: code ${code ?? 0} — ${liveRuns.e2e.finalReport?.summary?.total ?? 0} tests (${Math.round(wallClock / 1000)}s)`);
  });

  child.on('error', (err) => {
    if (!liveRuns.e2e) return;
    console.error(`[E2E] spawn error: ${err.message}`);
    liveRuns.e2e.status = 'error';
    liveRuns.e2e.error = err.message;
    saveRunState('e2e', 'error');
  });

  res.json({ status: 'started' });
});

/** POST /tests/e2e/stop — Stop a running E2E test */
router.post('/tests/e2e/stop', (_req: Request, res: Response) => {
  if (requireTestPassword(_req, res)) return;

  const run = liveRuns.e2e;
  if (!run || run.status !== 'running') {
    return res.json({ status: 'not_running' });
  }

  const pid = run.pid || loadRunState('e2e')?.pid;
  if (!pid) {
    return res.json({ status: 'error', error: 'No PID found' });
  }

  try {
    process.kill(pid, 'SIGTERM');
    console.log(`[E2E] Stopped: killed PID ${pid}`);
    run.status = 'error';
    run.error = 'Stopped by user';
    saveRunState('e2e', 'done');
    return res.json({ status: 'stopped' });
  } catch (err: any) {
    console.error(`[E2E] Failed to kill PID ${pid}:`, err.message);
    return res.json({ status: 'error', error: err.message });
  }
});

/** GET /tests/:area — Return cached results, live progress, or 'none' */
router.get('/tests/:area', (req: Request, res: Response) => {
  const area = req.params.area as 'backend' | 'frontend';
  if (area !== 'backend' && area !== 'frontend') {
    return res.status(400).json({ error: 'Area must be "backend" or "frontend"' });
  }

  const runKey = `unit_${area}`;
  const run = liveRuns[runKey];

  if (run?.status === 'running') {
    const passed = run.results.filter(r => r.status === 'passed').length;
    const failed = run.results.filter(r => r.status === 'failed').length;
    return res.json({
      status: 'running',
      startedAt: run.startedAt,
      elapsed: Date.now() - run.startedAt,
      liveResults: run.results,
      liveSummary: { completed: run.results.length, passed, failed },
    });
  }

  const cacheKey = `tests_${area}`;
  const cached = testCache[cacheKey];
  if (cached && Date.now() - cached.ts < TEST_CACHE_TTL) {
    return res.json({ status: 'ready', ...cached.data });
  }

  /* istanbul ignore next -- requires live test run to complete */
  if (run?.status === 'done' && run.finalReport) {
    return res.json({ status: 'ready', ...run.finalReport });
  }

  const saved = loadTestReport(area);
  if (saved) {
    testCache[cacheKey] = { data: saved, ts: Date.now() };
    return res.json({ status: 'ready', ...saved });
  }

  return res.json({ status: 'none' });
});

/** POST /tests/:area/run — Start an async test run with live result streaming */
router.post('/tests/:area/run', (req: Request, res: Response) => {
  if (requireTestPassword(req, res)) return;
  const area = req.params.area as 'backend' | 'frontend';
  if (area !== 'backend' && area !== 'frontend') {
    return res.status(400).json({ error: 'Area must be "backend" or "frontend"' });
  }

  const runKey = `unit_${area}`;
  if (liveRuns[runKey]?.status === 'running') {
    return res.json({ status: 'running' });
  }

  const dir = area === 'backend' ? path.join(ROOT, 'backend') : path.join(ROOT, 'frontend');
  const cacheKey = `tests_${area}`;

  const failedOnly = req.body?.failedOnly === true;
  let testNamePattern = '';
  if (failedOnly) {
    const prev = testCache[cacheKey]?.data || liveRuns[runKey]?.finalReport || loadTestReport(area);
    if (prev) {
      const failedNames = prev.suites.flatMap((s: TestSuite) => s.tests.filter((t: TestResult) => t.status === 'failed').map((t: TestResult) => t.name));
      if (failedNames.length > 0) {
        testNamePattern = failedNames.map((n: string) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      }
    }
    if (!testNamePattern) {
      return res.json({ status: 'skipped', message: 'No failed tests to re-run' });
    }
  }

  const previousUnitReport = failedOnly
    ? (testCache[cacheKey]?.data || liveRuns[runKey]?.finalReport || loadTestReport(area))
    : null;

  liveRuns[runKey] = { status: 'running', startedAt: Date.now(), results: [] };

  const jestBin = area === 'backend' ? JEST_BIN_BE : JEST_BIN_FE;
  const jestArgs = ['--verbose', '--coverage', '--passWithNoTests', '--forceExit', '--runInBand'];
  if (testNamePattern) jestArgs.push('--testNamePattern', testNamePattern);

  console.log(`[${area}] Spawning: ${jestBin} ${jestArgs.join(' ')}`);

  const { SUPPRESS_SMS: _drop, ...cleanEnv } = process.env;
  let child: ReturnType<typeof spawn>;
  try {
    child = spawn(jestBin, jestArgs, {
      cwd: dir,
      env: { ...cleanEnv, CI: 'true', NODE_ENV: 'test' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (spawnErr: any) {
    console.error(`[${area}] spawn threw:`, spawnErr.message);
    liveRuns[runKey].status = 'error';
    liveRuns[runKey].error = `Failed to spawn Jest: ${spawnErr.message}`;
    return res.json({ status: 'error', error: liveRuns[runKey].error });
  }

  let currentSuite = '';
  let lineBuf = '';

  (child.stdout as any)?.setEncoding?.('utf8');
  (child.stderr as any)?.setEncoding?.('utf8');

  const processChunk = (chunk: string | Buffer) => {
    if (!liveRuns[runKey]) return;
    lineBuf += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    const lines = lineBuf.split('\n');
    lineBuf = lines.pop() || '';
    for (const line of lines) {
      const { result, newSuite } = parseJestLine(line, currentSuite);
      if (newSuite) currentSuite = newSuite;
      if (result) liveRuns[runKey].results.push(result);
    }
  };

  child.stdout?.on('data', processChunk);
  child.stderr?.on('data', processChunk);

  child.on('close', () => {
    if (lineBuf) {
      const { result, newSuite } = parseJestLine(lineBuf, currentSuite);
      if (newSuite) currentSuite = newSuite;
      if (liveRuns[runKey] && result) liveRuns[runKey].results.push(result);
    }
    const run = liveRuns[runKey];
    if (!run) return;
    let report = buildReportFromLive(run.results);
    report.coverage = readCoverage(dir);
    if (failedOnly && previousUnitReport) {
      report = mergeReports(previousUnitReport as TestReport, report);
    }
    run.finalReport = report;
    run.status = 'done';
    testCache[cacheKey] = { data: run.finalReport, ts: Date.now() };
    saveTestReport(area, run.finalReport, true);
    console.log(`${area} tests finished: ${run.finalReport.summary.passed}/${run.finalReport.summary.total} passed`);
  });

  child.on('error', (err) => {
    if (!liveRuns[runKey]) return;
    liveRuns[runKey].status = 'error';
    liveRuns[runKey].error = err.message;
    console.error(`${area} test spawn error:`, err.message);
  });

  res.json({ status: 'started' });
});

function parsePlaywrightJson(raw: string): TestReport | null {
  let json: any;
  try {
    const jsonStart = raw.indexOf('{');
    json = JSON.parse(jsonStart >= 0 ? raw.substring(jsonStart) : raw);
  } catch {
    return null;
  }

  const suiteMap = new Map<string, TestSuite>();

  function collectSpecs(node: any, file: string, prefix: string, project: string) {
    const suite = suiteMap.get(file)!;
    for (const spec of node.specs || []) {
      for (const test of spec.tests || []) {
        const results = test.results || [];
        const lastResult = results[results.length - 1];
        if (lastResult?.status === 'skipped') continue;
        const status = lastResult?.status === 'passed' ? 'passed' : 'failed';
        const duration = lastResult?.duration || 0;
        const retries = Math.max(0, results.length - 1);
        suite.tests.push({
          name: prefix ? `${prefix} > ${spec.title}` : spec.title,
          status,
          duration,
          retries,
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

  function walkSuites(nodes: any[], inheritedProject: string) {
    for (const node of nodes) {
      const file = node.file ? node.file.replace(ROOT + '/', '') : '';
      const project = node.project?.name || inheritedProject;
      if (file) {
        if (!suiteMap.has(file)) {
          suiteMap.set(file, { file, status: 'passed', duration: 0, tests: [] });
        }
        collectSpecs(node, file, '', project);
      } else {
        const projFromTitle = !file && node.title && ['chromium', 'mobile', 'setup', 'teardown', 'firefox', 'webkit'].includes(node.title.toLowerCase()) ? node.title.toLowerCase() : '';
        walkSuites(node.suites || [], projFromTitle || project);
      }
    }
  }
  walkSuites(json.suites || [], '');

  const INFRA = new Set(['setup', 'teardown']);
  const suites = Array.from(suiteMap.values())
    .map(s => ({ ...s, tests: s.tests.filter(t => !INFRA.has(t.project || '')) }))
    .filter(s => s.tests.length > 0);
  let total = 0, passed = 0, failed = 0, flaky = 0, totalDuration = 0;
  for (const s of suites) {
    for (const t of s.tests) {
      total++;
      if (t.status === 'passed') passed++; else failed++;
      if ((t.retries || 0) > 0) flaky++;
    }
    totalDuration += s.duration;
  }

  if (total === 0) return null;

  const elapsed = json.stats?.duration || undefined;

  return {
    generatedAt: new Date().toISOString(),
    summary: { total, passed, failed, flaky, suites: suites.length, duration: totalDuration, elapsed },
    suites,
    coverage: null,
  };
}

export default router;
