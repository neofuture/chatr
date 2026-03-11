import { Router, Request, Response } from 'express';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const router = Router();
const ROOT = path.resolve(__dirname, '../../../');
const SKIP = new Set(['node_modules', '.next', 'dist', 'coverage', '.git']);

let cache: { data: object; ts: number } | null = null;
const CACHE_TTL = 30_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function git(cmd: string): string {
  try { return execSync(`git ${cmd}`, { cwd: ROOT, timeout: 8000, encoding: 'utf8' }).trim(); }
  catch { return ''; }
}

function run(cmd: string): string {
  try { return execSync(cmd, { timeout: 5000, encoding: 'utf8' }).trim(); }
  catch { return ''; }
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
  } catch { return []; }
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
  } catch { return []; }
}

function readPkgDeps(pkgPath: string): { prod: number; dev: number; prodList: string[]; devList: string[] } {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const prodList = Object.keys(pkg.dependencies || {}).sort();
    const devList = Object.keys(pkg.devDependencies || {}).sort();
    return { prod: prodList.length, dev: devList.length, prodList, devList };
  } catch { return { prod: 0, dev: 0, prodList: [], devList: [] }; }
}

function readPkgScripts(pkgPath: string): { name: string; command: string }[] {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return Object.entries(pkg.scripts || {}).map(([name, command]) => ({ name, command: String(command) }));
  } catch { return []; }
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
    .sort((a, b) => b.commits - a.commits);
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
  const recentCommits = commits.slice(0, 30).map(c => ({ hash: c.hash, date: c.date, message: c.message, author: c.author }));

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
  const totalSourceFiles = tsFiles + cssFiles + jsFiles;
  const totalLoc = tsLines + cssLines + jsLines;
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
    .sort((a, b) => b.net - a.net);

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

  // Components without tests
  const componentsWithoutTests = componentDetails.filter(c => !c.hasTest).map(c => ({ name: c.name, lines: c.lines }));

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
    loc: { typescript: tsLines, css: cssLines, javascript: jsLines },
    locByArea: { frontend: feLines, backend: beLines, widget: wLines },
    files: { typescript: tsFiles, css: cssFiles, javascript: jsFiles },
    fileTypes: { tsx: tsxFiles, ts: pureTs, moduleCss, plainCss, js: jsFiles },
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
    codeOwnership,
    branchCount,
    tagCount,
    bundleSizeBytes,
    componentsWithoutTests,
    staleFiles,
  };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

router.get('/', async (_req: Request, res: Response) => {
  try {
    if (cache && Date.now() - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = buildDashboard();
    cache = { data, ts: Date.now() };
    res.json(data);
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to generate dashboard data' });
  }
});

router.post('/invalidate', (_req: Request, res: Response) => {
  cache = null;
  res.json({ ok: true });
});

export default router;
