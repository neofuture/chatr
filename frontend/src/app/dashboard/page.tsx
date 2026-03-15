'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import SiteNav from '@/components/site/SiteNav';
import { version } from '@/version';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const REFRESH_INTERVAL = 30_000;

/* eslint-disable @typescript-eslint/no-explicit-any */
type D = any;

function fmtDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y.slice(2)}`;
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------
const CARD: React.CSSProperties = { background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem' };
const H2: React.CSSProperties = { fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 1rem' };
const GRID2: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1rem', marginBottom: '1.5rem' };
const GRID3: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: '1rem', marginBottom: '1.5rem' };
const SCROLLBOX: React.CSSProperties = { maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 };
const SUB: React.CSSProperties = { fontSize: '0.7rem', color: 'var(--text-secondary)' };

function fmtMs(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return remM > 0 ? `${h}h ${remM}m` : `${h}h`;
}

function fmtSec(sec: number): string { return fmtMs(sec * 1000); }

// ---------------------------------------------------------------------------
// Icon helper (Font Awesome)
// ---------------------------------------------------------------------------
function Ico({ children, size = 16 }: { children: string; size?: number }) {
  return <i className={children} style={{ fontSize: size, lineHeight: 1, flexShrink: 0, width: size, textAlign: 'center' }} />;
}

// ---------------------------------------------------------------------------
// Reusable small components
// ---------------------------------------------------------------------------

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '1rem 0', textAlign: 'center' }}>
      <i className="fad fa-check-circle" style={{ fontSize: '1.5rem', marginBottom: 6, display: 'block', opacity: 0.5 }} />
      {message}
    </div>
  );
}

function StatCard({ label, value, sub, icon, color, scrollTo }: { label: string; value: string | number; sub?: string; icon: string; color: string; scrollTo?: string }) {
  const handleClick = () => {
    if (!scrollTo) return;
    const el = document.getElementById(scrollTo);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <div style={{ ...CARD, display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', transition: 'transform 0.15s, box-shadow 0.15s', cursor: scrollTo ? 'pointer' : 'default' }}
      onClick={handleClick}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
      <div style={{ width: 38, height: 38, borderRadius: 8, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0, color: '#fff' }}>
        <i className={icon} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.1, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2, whiteSpace: 'nowrap' }}>{label}</div>
        {sub && <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>}
      </div>
    </div>
  );
}

function BarChart({ data, maxBars = 60, color = 'linear-gradient(to top,#3b82f6,#60a5fa)' }: { data: { label: string; value: number }[]; maxBars?: number; color?: string }) {
  const sliced = data.slice(-maxBars);
  const max = Math.max(...sliced.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 110, width: '100%' }}>
      {sliced.map((d, i) => (
        <div key={`${d.label}-${i}`} title={`${d.label}: ${d.value}`}
          style={{ flex: 1, height: `${(d.value / max) * 100}%`, background: color, borderRadius: '3px 3px 0 0', minHeight: d.value > 0 ? 3 : 1, cursor: 'default', transition: 'opacity 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }} />
      ))}
    </div>
  );
}

function LangBar({ loc }: { loc: D }) {
  const total = (loc.typescript || 0) + (loc.css || 0) + (loc.javascript || 0) + (loc.shell || 0);
  if (!total) return null;
  const segs = [
    { label: 'TypeScript', value: loc.typescript || 0, color: '#3178c6' },
    { label: 'CSS', value: loc.css || 0, color: '#563d7c' },
    { label: 'JavaScript', value: loc.javascript || 0, color: '#f7df1e' },
    { label: 'Shell', value: loc.shell || 0, color: '#e879f9' },
  ].filter(s => s.value > 0);
  return (
    <div>
      <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 14, marginBottom: '0.75rem' }}>
        {segs.map(s => <div key={s.label} title={`${s.label}: ${s.value.toLocaleString()}`} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} />)}
      </div>
      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
        {segs.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, display: 'inline-block' }} />
            {s.label} — {s.value.toLocaleString()} ({((s.value / total) * 100).toFixed(1)}%)
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniBar({ value, max, color = '#3b82f6' }: { value: number; max: number; color?: string }) {
  return (
    <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
      <div style={{ width: `${Math.min((value / max) * 100, 100)}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.3s' }} />
    </div>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return <span style={{ fontSize: '0.6rem', padding: '1px 6px', borderRadius: 4, background: `${color}22`, color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{children}</span>;
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', display: 'inline-block' }}>{children}</span>;
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = { GET: '#10b981', POST: '#3b82f6', PUT: '#f59e0b', PATCH: '#8b5cf6', DELETE: '#ef4444' };
  return <span style={{ fontSize: '0.6rem', padding: '1px 5px', borderRadius: 3, background: colors[method] || '#64748b', color: '#fff', fontWeight: 700, fontFamily: 'monospace', minWidth: 36, textAlign: 'center', display: 'inline-block' }}>{method}</span>;
}

// GitHub-style contribution heatmap
function Heatmap({ data }: { data: { date: string; count: number; level: number }[] }) {
  const levels = ['rgba(255,255,255,0.04)', '#0e4429', '#006d32', '#26a641', '#39d353'];
  const COL_W = 13;
  const LABEL_W = 28;

  const lookup = new Map(data.map(d => [d.date, d]));
  const firstDate = new Date(data[0].date + 'T12:00:00');
  const startSunday = new Date(firstDate);
  startSunday.setDate(startSunday.getDate() - startSunday.getDay());

  const weeks: { date: string; count: number; level: number; dayOfWeek: number }[][] = [];
  const cursor = new Date(startSunday);
  const endDate = new Date(data[data.length - 1].date + 'T12:00:00');

  while (cursor <= endDate) {
    const week: typeof weeks[0] = [];
    for (let dow = 0; dow < 7; dow++) {
      const key = cursor.toISOString().substring(0, 10);
      const entry = lookup.get(key);
      if (entry) week.push({ ...entry, dayOfWeek: dow });
      else if (cursor >= firstDate && cursor <= endDate) week.push({ date: key, count: 0, level: 0, dayOfWeek: dow });
      cursor.setDate(cursor.getDate() + 1);
    }
    if (week.length > 0) weeks.push(week);
  }

  const months: { label: string; left: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((w, wi) => {
    const d = new Date(w[0].date + 'T12:00:00');
    const m = d.getMonth();
    if (m !== lastMonth) { months.push({ label: d.toLocaleString('en', { month: 'short' }), left: LABEL_W + wi * COL_W }); lastMonth = m; }
  });

  return (
    <div>
      <div style={{ position: 'relative', height: 16, marginBottom: 2 }}>
        {months.map((m, i) => <span key={i} style={{ position: 'absolute', left: m.left, fontSize: '0.6rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{m.label}</span>)}
      </div>
      <div style={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.55rem', color: 'var(--text-secondary)', paddingTop: 2, minWidth: LABEL_W - 3 }}>
          {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((d, i) => <div key={i} style={{ height: 10, lineHeight: '10px' }}>{d}</div>)}
        </div>
        <div style={{ display: 'flex', gap: 3, overflow: 'hidden' }}>
          {weeks.map((w, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {w[0] && w[0].dayOfWeek > 0 && wi === 0 && Array.from({ length: w[0].dayOfWeek }).map((_, pi) => <div key={`p-${pi}`} style={{ width: 10, height: 10 }} />)}
              {w.map((d, di) => <div key={`${wi}-${di}`} title={`${fmtDate(d.date)}: ${d.count} commits`} style={{ width: 10, height: 10, borderRadius: 2, background: levels[d.level], cursor: 'default' }} />)}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 8, justifyContent: 'flex-end', fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
        Less {levels.map((c, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />)} More
      </div>
    </div>
  );
}

// Donut chart
function Donut({ segments, size = 120, label }: { segments: { label: string; value: number; color: string }[]; size?: number; label?: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (!total) return null;
  const r = size / 2 - 8;
  const c = size / 2;
  let cum = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map(s => {
          const pct = s.value / total;
          const dash = 2 * Math.PI * r;
          const offset = dash * (1 - pct);
          const rotation = cum * 360 - 90;
          cum += pct;
          return <circle key={s.label} cx={c} cy={c} r={r} fill="none" stroke={s.color} strokeWidth={14}
            strokeDasharray={`${dash}`} strokeDashoffset={offset}
            transform={`rotate(${rotation} ${c} ${c})`} style={{ transition: 'all 0.3s' }} />;
        })}
        <text x={c} y={c - (label ? 6 : 0)} textAnchor="middle" dy="0.35em" fill="var(--text)" fontSize={size * 0.18} fontWeight={700}>{total.toLocaleString()}</text>
        {label && <text x={c} y={c + 12} textAnchor="middle" fill="var(--text-secondary)" fontSize={size * 0.09}>{label}</text>}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {segments.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
            <span style={{ fontWeight: 600 }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Semicircle gauge
function HealthGauge({ label, value, max, unit, color }: { label: string; value: number; max: number; unit: string; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      <div style={{ position: 'relative', width: 80, height: 44, margin: '0 auto', overflow: 'hidden' }}>
        <svg width={80} height={44} viewBox="0 0 80 44">
          <path d="M 8 40 A 32 32 0 0 1 72 40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} strokeLinecap="round" pathLength={100} />
          <path d="M 8 40 A 32 32 0 0 1 72 40" fill="none" stroke={color} strokeWidth={6} strokeLinecap="round"
            pathLength={100} strokeDasharray={`${pct} 100`} style={{ transition: 'stroke-dasharray 0.5s' }} />
        </svg>
      </div>
      <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: 4 }}>{value}{unit}</div>
    </div>
  );
}

function LiveSummaryBar({ live, color = '#3b82f6' }: { live: D; color?: string }) {
  const elapsed = Math.round((live.elapsed || 0) / 1000);
  const { completed = 0, passed = 0, failed = 0, retrying = 0 } = live.liveSummary || {};
  return (
    <div>
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: failed === 0 ? '#10b981' : '#ef4444' }}>
            {passed}/{completed}
          </div>
          <div style={SUB}>tests passed</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#8b5cf6' }}>{fmtSec(elapsed)}</div>
          <div style={SUB}>duration</div>
        </div>
        {failed > 0 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{failed}</div>
            <div style={SUB}>failed</div>
          </div>
        )}
        {retrying > 0 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{retrying}</div>
            <div style={SUB}>retried</div>
          </div>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fad fa-spinner-third fa-spin" style={{ color, fontSize: '0.9rem' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color }}>RUNNING</span>
        </div>
      </div>
      {completed > 0 && (
        <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: '1rem', display: 'flex' }}>
          {passed > 0 && <div style={{ width: `${(passed / completed) * 100}%`, height: '100%', background: failed === 0 ? 'linear-gradient(to right, #10b981, #34d399)' : '#10b981', transition: 'width 0.3s' }} />}
          {failed > 0 && <div style={{ width: `${(failed / completed) * 100}%`, height: '100%', background: '#ef4444', transition: 'width 0.3s' }} />}
        </div>
      )}
    </div>
  );
}

function LiveTestFeed({ live, color = '#3b82f6' }: { live: D; color?: string }) {
  const results: D[] = live.liveResults || [];
  return (
    <div>
      <LiveSummaryBar live={live} color={color} />
      <div style={{ ...SCROLLBOX, maxHeight: 400 }}>
        {results.map((r: D, i: number) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
            fontSize: '0.78rem', borderBottom: '1px solid var(--border)',
            animation: i >= results.length - 3 ? 'liveTestFadeIn 0.4s ease-out' : undefined,
          }}>
            <i className={`fas fa-${r.status === 'passed' ? 'check-circle' : r.status === 'skipped' ? 'minus-circle' : 'times-circle'}`}
              style={{ color: r.status === 'passed' ? '#10b981' : r.status === 'skipped' ? '#94a3b8' : '#ef4444', fontSize: '0.7rem', width: 14, flexShrink: 0 }} />
            {r.area && <Badge color={r.area === 'frontend' ? '#3b82f6' : '#10b981'}>{r.area === 'frontend' ? 'FE' : 'BE'}</Badge>}
            {(r.retries || 0) > 0 && <Badge color={r.status === 'passed' ? '#f59e0b' : '#ef4444'}>↻ attempt {(r.retries || 0) + 1}/3</Badge>}
            <code style={{ color: '#60a5fa', minWidth: 100, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}
              title={r.suite}>{r.suite.replace(/.*\//, '').replace(/\.\w+$/, '')}</code>
            <span style={{ flex: 1, color: r.status === 'passed' ? 'var(--text-secondary)' : '#fca5a5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title={r.name}>{r.name}</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', flexShrink: 0, minWidth: 45, textAlign: 'right' }}>
              {fmtMs(r.duration)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PROJECT_COLORS: Record<string, string> = { chromium: '#8b5cf6', mobile: '#ec4899' };
const PROJECT_LABELS: Record<string, string> = { chromium: 'Chrome', mobile: 'Mobile' };

function groupResultsBySuite(results: D[]): D[] {
  const map = new Map<string, D>();
  for (const r of results) {
    const key = r.suite || 'unknown';
    if (!map.has(key)) {
      map.set(key, { file: key, status: 'passed', duration: 0, tests: [] });
    }
    const suite = map.get(key)!;
    suite.tests.push(r);
    suite.duration += r.duration || 0;
    if (r.status === 'failed') suite.status = 'failed';
  }
  return Array.from(map.values());
}

function LiveE2EFeed({ live, color = '#a855f7', expandAll = false }: { live: D; color?: string; expandAll?: boolean }) {
  const results: D[] = live.liveResults || [];
  const suites = groupResultsBySuite(results);
  return (
    <div>
      <LiveSummaryBar live={live} color={color} />
      <div style={{ ...SCROLLBOX, maxHeight: 400 }}>
        {suites.map((suite: D) => (
          <SuiteRow key={`${suite.file}-${expandAll}`} suite={suite} defaultOpen={expandAll} />
        ))}
      </div>
    </div>
  );
}

function FilterPills({ options, value, onChange }: { options: { id: string; label: string; count: number }[]; value: string; onChange: (v: string) => void }) {
  const PILL: React.CSSProperties = { padding: '2px 10px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', border: '1px solid transparent', transition: 'all 0.15s' };
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {options.map(o => {
        const active = value === o.id;
        const pillColors: Record<string, string> = { failed: '#f87171', flaky: '#f59e0b', retried: '#a78bfa' };
        const accent = pillColors[o.id] || '#60a5fa';
        const accentBg = `${accent}33`;
        const accentBorder = `${accent}66`;
        const isSpecial = o.id in pillColors;
        return (
          <button key={o.id} onClick={() => onChange(o.id)}
            style={{ ...PILL, background: active ? accentBg : 'rgba(255,255,255,0.04)', color: active ? accent : (isSpecial ? accent : 'var(--text-secondary)'), borderColor: active ? accentBorder : 'rgba(255,255,255,0.06)' }}>
            {o.label} <span style={{ opacity: 0.6, marginLeft: 3 }}>{o.count}</span>
          </button>
        );
      })}
    </div>
  );
}

function SuiteRow({ suite, area, defaultOpen = false }: { suite: D; area?: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => { setOpen(defaultOpen); }, [defaultOpen]);
  const allPassed = suite.tests.every((t: D) => t.status === 'passed');
  const hasRetries = suite.tests.some((t: D) => (t.retries || 0) > 0);
  const projects = [...new Set(suite.tests.map((t: D) => t.project).filter(Boolean))];
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <div onClick={() => setOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer', fontSize: '0.8rem' }}>
        <i className={`fas fa-${allPassed ? 'check-circle' : 'times-circle'}`} style={{ color: allPassed ? '#10b981' : '#ef4444', fontSize: '0.7rem' }} />
        {area && <Badge color={area === 'frontend' ? '#3b82f6' : '#10b981'}>{area === 'frontend' ? 'FE' : 'BE'}</Badge>}
        {projects.map((p) => <Badge key={String(p)} color={PROJECT_COLORS[String(p)] || '#6b7280'}>{PROJECT_LABELS[String(p)] || String(p)}</Badge>)}
        {hasRetries && <Badge color="#f59e0b">↻ flaky</Badge>}
        <code title={suite.file} style={{ color: '#60a5fa', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {suite.file.replace(/^(backend|frontend)\/src\//, '').replace(/^e2e\//, '').replace(/\.spec\.ts$/, '').replace(/\.test\.tsx?$/, '')}
        </code>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
          {suite.tests.filter((t: D) => t.status === 'passed').length}/{suite.tests.length}
        </span>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', minWidth: 40, textAlign: 'right' }}>
          {fmtMs(suite.duration)}
        </span>
        <i className={`fas fa-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: '0.5rem', color: 'var(--text-secondary)' }} />
      </div>
      {open && (
        <div style={{ paddingLeft: 20, paddingBottom: 6 }}>
          {suite.tests.map((t: D, i: number) => {
            const retries = t.retries || 0;
            const attempt = retries + 1;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', padding: '2px 0' }}>
                <i className={`fas fa-${t.status === 'passed' ? 'check' : 'xmark'}`}
                  style={{ color: t.status === 'passed' ? '#10b981' : '#ef4444', fontSize: '0.6rem', width: 10 }} />
                <span style={{ flex: 1, color: t.status === 'passed' ? 'var(--text-secondary)' : '#fca5a5' }}>{t.name}</span>
                {retries > 0 && (
                  <span style={{ fontSize: '0.55rem', padding: '1px 5px', borderRadius: 3,
                    background: t.status === 'passed' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                    color: t.status === 'passed' ? '#f59e0b' : '#ef4444', fontWeight: 600 }}>
                    ↻ attempt {attempt}/3 {t.status === 'passed' ? '· flaky' : '· failed'}
                  </span>
                )}
                {retries === 0 && t.status === 'failed' && (
                  <span style={{ fontSize: '0.55rem', padding: '1px 5px', borderRadius: 3,
                    background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontWeight: 600 }}>
                    1/3
                  </span>
                )}
                <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
                  {fmtMs(t.duration || 0)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TODO_COLORS: Record<string, string> = { TODO: '#3b82f6', FIXME: '#ef4444', HACK: '#f59e0b', XXX: '#ec4899', WARN: '#f97316' };

function Section({ title, icon, children, defaultOpen = true, id }: { title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean; id?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div id={id} style={CARD}>
      <h2 style={{ ...H2, cursor: 'pointer', userSelect: 'none' }} onClick={() => setOpen(p => !p)}>
        <Ico>{icon}</Ico> {title}
        <i className={`fas fa-chevron-${open ? 'up' : 'down'}`} style={{ marginLeft: 'auto', fontSize: '0.6rem', color: 'var(--text-secondary)' }} />
      </h2>
      {open && children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const [data, setData] = useState<D>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [testPassword, setTestPassword] = useState<string>('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [passwordError, setPasswordError] = useState<string>('');
  const [feReport, setFeReport] = useState<D>(null);
  const [beReport, setBeReport] = useState<D>(null);
  const [feRunning, setFeRunning] = useState(false);
  const [beRunning, setBeRunning] = useState(false);
  const [feLive, setFeLive] = useState<D>(null);
  const [beLive, setBeLive] = useState<D>(null);
  const [e2eReport, setE2eReport] = useState<D>(null);
  const [e2eRunning, setE2eRunning] = useState(false);
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [e2eFilter, setE2eFilter] = useState<string>('all');
  const [e2eLive, setE2eLive] = useState<D>(null);

  const fetchData = useCallback(() => {
    fetch(`${API}/api/dashboard`)
      .then(r => r.ok ? r.json() : Promise.reject('Failed to load'))
      .then(d => { setData(d); setLastRefresh(new Date()); setError(null); })
      .catch(e => setError(String(e)));
  }, []);

  const pwRef = useRef(testPassword);
  pwRef.current = testPassword;

  const getTestHeaders = useCallback((pw?: string) => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    const p = pw || pwRef.current;
    if (p) h['x-test-password'] = p;
    return h;
  }, []);

  const requirePassword = useCallback((action: (pw: string) => void) => {
    if (pwRef.current) { action(pwRef.current); return; }
    setPendingAction(() => action);
    setPasswordError('');
    setShowPasswordPrompt(true);
  }, []);

  const runFreshTests = useCallback((area?: 'frontend' | 'backend', failedOnly?: boolean) => {
    const doRun = (pw: string) => {
      const areas = area ? [area] : ['frontend', 'backend'] as const;
      for (const a of areas) {
        if (!failedOnly) {
          if (a === 'frontend') { setFeReport(null); setFeLive(null); }
          else { setBeReport(null); setBeLive(null); }
        }
        if (a === 'frontend') setFeRunning(true); else setBeRunning(true);
        fetch(`${API}/api/dashboard/tests/${a}/run`, {
          method: 'POST',
          headers: getTestHeaders(pw),
          body: JSON.stringify({ failedOnly: !!failedOnly }),
        }).then(r => {
          if (r.status === 401) { setTestPassword(''); setShowPasswordPrompt(true); setPendingAction(() => doRun); setPasswordError('Invalid password'); throw new Error('Unauthorized'); }
          return r.json();
        }).then(d => {
          if (d.status === 'skipped') {
            if (a === 'frontend') setFeRunning(false); else setBeRunning(false);
          }
        }).catch(() => {
          if (a === 'frontend') setFeRunning(false); else setBeRunning(false);
        });
      }
    };
    requirePassword(doRun);
  }, [getTestHeaders, requirePassword]);

  const startE2E = useCallback(() => {
    const doRun = (pw: string) => {
      setE2eRunning(true);
      setE2eReport(null);
      setE2eLive(null);
      fetch(`${API}/api/dashboard/tests/e2e/run`, { method: 'POST', headers: getTestHeaders(pw) })
        .then(r => {
          if (r.status === 401) { setTestPassword(''); setE2eRunning(false); setShowPasswordPrompt(true); setPendingAction(() => doRun); setPasswordError('Invalid password'); throw new Error('Unauthorized'); }
          return r.ok ? r.json() : Promise.reject('Failed');
        })
        .catch(() => {});
    };
    requirePassword(doRun);
  }, [getTestHeaders, requirePassword]);

  useEffect(() => {
    if (!e2eRunning) return;
    const id = setInterval(() => {
      fetch(`${API}/api/dashboard/tests/e2e`)
        .then(r => r.ok ? r.json() : Promise.reject(''))
        .then(d => {
          if (d.status === 'ready') {
            setE2eReport(d);
            setE2eRunning(false);
            setE2eLive(null);
          } else if (d.status === 'running') {
            setE2eLive(d);
          }
        })
        .catch(() => {});
    }, 2000);
    return () => clearInterval(id);
  }, [e2eRunning]);

  useEffect(() => {
    if (!feRunning || feReport) return;
    const id = setInterval(() => {
      fetch(`${API}/api/dashboard/tests/frontend`)
        .then(r => r.ok ? r.json() : Promise.reject(''))
        .then(d => {
          if (d.status === 'ready') { setFeReport(d); setFeRunning(false); setFeLive(null); }
          else if (d.status === 'running') { setFeLive(d); }
        })
        .catch(() => {});
    }, 2000);
    return () => clearInterval(id);
  }, [feRunning, feReport]);

  useEffect(() => {
    if (!beRunning || beReport) return;
    const id = setInterval(() => {
      fetch(`${API}/api/dashboard/tests/backend`)
        .then(r => r.ok ? r.json() : Promise.reject(''))
        .then(d => {
          if (d.status === 'ready') { setBeReport(d); setBeRunning(false); setBeLive(null); }
          else if (d.status === 'running') { setBeLive(d); }
        })
        .catch(() => {});
    }, 2000);
    return () => clearInterval(id);
  }, [beRunning, beReport]);

  useEffect(() => {
    fetchData();
    // Auto-load cached test results on mount
    const loadCached = (url: string, setReport: (d: D) => void, setRunning: (b: boolean) => void, setLive: (d: D) => void) => {
      fetch(url).then(r => r.ok ? r.json() : null).then(d => {
        if (!d) return;
        if (d.status === 'ready') { setReport(d); }
        else if (d.status === 'running') { setRunning(true); setLive(d); }
      }).catch(() => {});
    };
    loadCached(`${API}/api/dashboard/tests/frontend`, setFeReport, setFeRunning, setFeLive);
    loadCached(`${API}/api/dashboard/tests/backend`, setBeReport, setBeRunning, setBeLive);
    loadCached(`${API}/api/dashboard/tests/e2e`, setE2eReport, setE2eRunning, setE2eLive);
  }, [fetchData]);
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [autoRefresh, fetchData]);

  return (
    <div style={{
      '--card-bg': 'rgba(255,255,255,0.04)', '--border': 'rgba(255,255,255,0.08)',
      '--text': '#e2e8f0', '--text-secondary': '#94a3b8', '--bg': '#0f172a',
      minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      paddingTop: 64,
    } as React.CSSProperties}>
      <SiteNav />

      <style>{`
        @keyframes liveTestFadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes livePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media (max-width: 1280px) {
          .db-overview { grid-template-columns: repeat(4, 1fr) !important; }
        }
        @media (max-width: 1024px) {
          .db-overview { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 768px) {
          .db-header { flex-direction: column !important; padding: 0.75rem 1rem !important; gap: 0.5rem !important; align-items: flex-start !important; }
          .db-header-right { flex-wrap: wrap !important; font-size: 0.7rem !important; gap: 0.5rem !important; }
          .db-header-branch { display: none !important; }
          .db-content { padding: 1rem 0.75rem 2rem !important; }
          .db-overview { grid-template-columns: repeat(2, 1fr) !important; gap: 0.5rem !important; }
          .db-grid2, .db-grid3 { grid-template-columns: 1fr !important; }
          .db-grid2 code, .db-grid3 code { min-width: 0 !important; flex: 1 !important; }
          .db-badges { display: none !important; }
        }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="db-header" style={{ borderBottom: '1px solid var(--border)', padding: '0.75rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10, background: 'rgba(15,23,42,0.85)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.85rem' }}>← Home</Link>
          <span style={{ color: 'var(--text-secondary)' }}>/</span>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
            <Ico size={20}>fad fa-chart-column</Ico> Project Dashboard
          </h1>
        </div>
        <div className="db-header-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          {lastRefresh && <span>Updated {lastRefresh.toLocaleTimeString()}</span>}
          <button onClick={() => setAutoRefresh(p => !p)} style={{ background: autoRefresh ? '#10b98133' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '3px 10px', color: autoRefresh ? '#10b981' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem' }}>
            {autoRefresh ? '● Live' : '○ Paused'}
          </button>
          <button onClick={fetchData} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '3px 10px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem' }}>↻ Refresh</button>
          {data && <span className="db-header-branch"><i className="fas fa-code-branch" /> {data.overview.currentBranch} <code style={{ color: '#60a5fa', marginLeft: 4 }}>{data.overview.latestHash}</code></span>}
        </div>
      </div>

      <div className="db-content" style={{ maxWidth: 1400, margin: '0 auto', padding: '1.5rem 2rem 3rem' }}>
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '1rem', color: '#fca5a5', marginBottom: '1rem' }}>{error}</div>}
        {!data && !error && <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}><div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}><i className="fad fa-spinner-third fa-spin" /></div>Loading metrics...</div>}

        {data && (<>

          {/* ── Overview Cards ──────────────────────────────────────── */}
          <div className="db-overview" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <StatCard label="Total Commits" value={data.overview.totalCommits} sub={`${data.health.commitsPerDay}/day avg`} icon="fas fa-code-commit" color="#3b82f6" scrollTo="sec-activity" />
            <StatCard label="Lines of Code" value={data.overview.totalLines} sub={`~${Math.round(data.overview.totalLines / 1000)}k`} icon="fas fa-laptop-code" color="#8b5cf6" scrollTo="sec-languages" />
            <StatCard label="Source Files" value={data.overview.totalFiles} sub={`${data.health.avgFileSize} avg loc`} icon="fas fa-folder" color="#06b6d4" scrollTo="sec-largest" />
            <StatCard label="Test Files" value={data.overview.testFiles} sub={`${data.testBreakdown.frontend}fe / ${data.testBreakdown.backend}be / ${data.testBreakdown.widget}w`} icon="fas fa-flask" color="#10b981" scrollTo="sec-test-results" />
            <StatCard label="E2E Tests" value="Playwright" sub="DM · Groups · Profile" icon="fas fa-browser" color="#a855f7" scrollTo="sec-e2e" />
            <StatCard label="API Endpoints" value={data.endpoints?.length || 0} sub={`${data.architecture.apiRoutes} route files`} icon="fas fa-network-wired" color="#f97316" scrollTo="sec-endpoints" />
            <StatCard label="Components" value={data.architecture.components} sub={`${data.architecture.hooks} hooks / ${data.architecture.contexts} ctx`} icon="fas fa-puzzle-piece" color="#ec4899" scrollTo="sec-architecture" />
            <StatCard label="DB Models" value={data.architecture.dbModels} sub={`${data.architecture.dbMigrations} migrations`} icon="fas fa-database" color="#14b8a6" scrollTo="sec-migrations" />
            <StatCard label="Dependencies" value={data.dependencies.total} sub={`${data.dependencies.frontend.prod + data.dependencies.backend.prod} prod`} icon="fas fa-box" color="#a855f7" scrollTo="sec-dependencies" />
            <StatCard label="Days Active" value={data.overview.daysActive} sub={data.overview.firstCommitDate?.substring(0, 10)} icon="fas fa-calendar" color="#f59e0b" scrollTo="sec-heatmap" />
            <StatCard label="Contributors" value={data.contributors.length} icon="fas fa-users" color="#6366f1" scrollTo="sec-contributors" />
            <StatCard label="Commit Streak" value={data.commitStreaks.current} sub={`${data.commitStreaks.longest} day best`} icon="fas fa-fire-flame-curved" color="#ef4444" scrollTo="sec-heatmap" />
            <StatCard label="Branches" value={data.branchCount} icon="fas fa-code-branch" color="#0ea5e9" scrollTo="sec-branches" />
            <StatCard label="Socket Events" value={data.socketEvents?.length || 0} icon="fas fa-plug" color="#84cc16" scrollTo="sec-socket" />
            <StatCard label="TODOs" value={data.todos?.length || 0} sub="in codebase" icon="fas fa-thumbtack" color="#fb923c" scrollTo="sec-todos" />
            <StatCard label="Pages" value={data.architecture.pages} sub={`${data.architecture.middleware} middleware`} icon="fas fa-file-lines" color="#38bdf8" scrollTo="sec-pages" />
            {data.bundleSizeBytes > 0 && <StatCard label="Bundle Size" value={`${(data.bundleSizeBytes / 1048576).toFixed(0)}MB`} icon="fas fa-weight-hanging" color="#f43f5e" />}
            {data.tagCount > 0 && <StatCard label="Tags" value={data.tagCount} icon="fas fa-tag" color="#c084fc" />}
          </div>

          {/* ── Code Health ────────────────────────────────────────── */}
          <div style={{ ...CARD, marginBottom: '1.5rem' }}>
            <h2 style={H2}><Ico>fad fa-heartbeat</Ico> Code Health</h2>
            <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '1rem' }}>
              <HealthGauge label="Avg File Size" value={data.health.avgFileSize} max={300} unit=" loc" color="#3b82f6" />
              <HealthGauge label="Backend Coverage" value={data.backendModules?.length ? +((data.backendTestedCount / data.backendModules.length) * 100).toFixed(0) : 0} max={100} unit="%" color="#10b981" />
              <HealthGauge label="Frontend Coverage" value={data.frontendModules?.length ? +(((data.frontendTestedCount ?? 0) / data.frontendModules.length) * 100).toFixed(0) : 0} max={100} unit="%" color="#f59e0b" />
              <HealthGauge label="Commits/Day" value={data.health.commitsPerDay} max={10} unit="" color="#8b5cf6" />
              <HealthGauge label="Largest File" value={data.health.largestFile?.lines || 0} max={1000} unit=" loc" color="#ec4899" />
            </div>
            {data.linesChanged && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981' }}>+{data.linesChanged.added.toLocaleString()}</div>
                  <div style={SUB}>added</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ef4444' }}>-{data.linesChanged.deleted.toLocaleString()}</div>
                  <div style={SUB}>deleted</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: data.linesChanged.net >= 0 ? '#3b82f6' : '#f59e0b' }}>{data.linesChanged.net >= 0 ? '+' : ''}{data.linesChanged.net.toLocaleString()}</div>
                  <div style={SUB}>net</div>
                </div>
              </div>
            )}
          </div>

          {/* ── Commit Intelligence ─────────────────────────────── */}
          <div className="db-grid2" style={{ ...GRID2, marginBottom: '1.5rem' }}>
            {/* Commit Types */}
            {data.commitTypes?.length > 0 && (
              <div style={CARD}>
                <h2 style={H2}><Ico>fad fa-tags</Ico> Commit Types</h2>
                {(() => {
                  const total = data.commitTypes.reduce((s: number, t: D) => s + t.count, 0);
                  const typeColors: Record<string, string> = {
                    feat: '#10b981', fix: '#ef4444', chore: '#6b7280', test: '#3b82f6',
                    refactor: '#8b5cf6', docs: '#06b6d4', style: '#ec4899', perf: '#f59e0b',
                    ci: '#14b8a6', build: '#f97316', other: '#475569',
                  };
                  return (
                    <div>
                      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: '0.75rem' }}>
                        {data.commitTypes.map((t: D) => (
                          <div key={t.type} title={`${t.type}: ${t.count}`}
                            style={{ width: `${(t.count / total) * 100}%`, background: typeColors[t.type] || '#475569', transition: 'width 0.3s' }} />
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem' }}>
                        {data.commitTypes.map((t: D) => (
                          <div key={t.type} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem' }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: typeColors[t.type] || '#475569', flexShrink: 0 }} />
                            <span style={{ fontWeight: 600, color: typeColors[t.type] || '#94a3b8' }}>{t.type}</span>
                            <span style={{ color: 'var(--text-secondary)' }}>{t.count}</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>({Math.round((t.count / total) * 100)}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Commit Size Stats */}
            <div style={CARD}>
              <h2 style={H2}><Ico>fad fa-ruler-combined</Ico> Commit Size</h2>
              <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#3b82f6' }}>{data.commitSizeStats?.avgSize ?? 0}</div>
                  <div style={SUB}>avg lines/commit</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#8b5cf6' }}>{data.commitSizeStats?.avgFiles ?? 0}</div>
                  <div style={SUB}>avg files/commit</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: data.linesChanged.deleted > 0 ? '#f59e0b' : '#10b981' }}>
                    {data.linesChanged.added > 0 ? (data.linesChanged.deleted / data.linesChanged.added * 100).toFixed(0) : 0}%
                  </div>
                  <div style={SUB}>churn rate</div>
                </div>
              </div>
              {data.commitSizeDistribution && (() => {
                const d = data.commitSizeDistribution;
                const buckets = [
                  { label: '≤10', count: d.tiny, color: '#10b981' },
                  { label: '11–50', count: d.small, color: '#3b82f6' },
                  { label: '51–200', count: d.medium, color: '#8b5cf6' },
                  { label: '201–500', count: d.large, color: '#f59e0b' },
                  { label: '500+', count: d.huge, color: '#ef4444' },
                ];
                const maxCount = Math.max(...buckets.map(b => b.count), 1);
                return (
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>SIZE DISTRIBUTION (lines changed)</div>
                    {buckets.map(b => (
                      <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: '0.72rem' }}>
                        <span style={{ width: 48, textAlign: 'right', color: 'var(--text-secondary)', flexShrink: 0 }}>{b.label}</span>
                        <div style={{ flex: 1, height: 14, borderRadius: 3, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                          <div style={{ width: `${(b.count / maxCount) * 100}%`, height: '100%', background: b.color, borderRadius: 3, transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ width: 28, color: 'var(--text-secondary)', fontWeight: 600 }}>{b.count}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ── Weekly Velocity ─────────────────────────────────── */}
          {data.weeklyVelocity?.length > 1 && (
            <div style={{ ...CARD, marginBottom: '1.5rem' }}>
              <h2 style={H2}><Ico>fad fa-gauge-high</Ico> Weekly Velocity</h2>
              {(() => {
                const weeks = data.weeklyVelocity;
                const maxVal = Math.max(...weeks.map((w: D) => Math.max(w.added, w.deleted)), 1);
                const barW = Math.max(8, Math.min(24, 800 / weeks.length));
                return (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120, overflowX: 'auto', paddingBottom: 20 }}>
                      {weeks.map((w: D, i: number) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, flexShrink: 0 }} title={`${w.week}: +${w.added.toLocaleString()} / -${w.deleted.toLocaleString()} (${w.commits} commits)`}>
                          <div style={{ width: barW, height: Math.max(2, (w.added / maxVal) * 100), background: '#10b981', borderRadius: '2px 2px 0 0' }} />
                          <div style={{ width: barW, height: Math.max(2, (w.deleted / maxVal) * 100), background: '#ef4444', borderRadius: '0 0 2px 2px' }} />
                          <span style={{ fontSize: '0.5rem', color: 'var(--text-secondary)', transform: 'rotate(-45deg)', transformOrigin: 'top left', whiteSpace: 'nowrap', marginTop: 4 }}>
                            {w.week.replace(/^\d{4}-/, '')}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: 8, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#10b981', borderRadius: 2, marginRight: 6 }} />Insertions</span>
                      <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#ef4444', borderRadius: 2, marginRight: 6 }} />Deletions</span>
                      <span style={{ marginLeft: 'auto' }}>
                        Avg: +{Math.round(weeks.reduce((s: number, w: D) => s + w.added, 0) / weeks.length).toLocaleString()}
                        / -{Math.round(weeks.reduce((s: number, w: D) => s + w.deleted, 0) / weeks.length).toLocaleString()} per week
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── Biggest Commits ──────────────────────────────────── */}
          {data.biggestCommits?.length > 0 && (
            <div style={{ ...CARD, marginBottom: '1.5rem' }}>
              <h2 style={H2}><Ico>fad fa-explosion</Ico> Biggest Commits</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {data.biggestCommits.map((c: D, i: number) => {
                  const total = (c.added || 0) + (c.deleted || 0);
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: i < data.biggestCommits.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: '#8b5cf6', width: 24, textAlign: 'center', flexShrink: 0 }}>#{i + 1}</span>
                      <code style={{ fontSize: '0.7rem', color: '#60a5fa', flexShrink: 0, fontWeight: 600 }}>{c.hash}</code>
                      <span title={c.message} style={{ fontSize: '0.8rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.message}</span>
                      <span style={{ fontSize: '0.7rem', color: '#10b981', flexShrink: 0, fontWeight: 600 }}>+{(c.added || 0).toLocaleString()}</span>
                      <span style={{ fontSize: '0.7rem', color: '#ef4444', flexShrink: 0, fontWeight: 600 }}>-{(c.deleted || 0).toLocaleString()}</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{c.files || 0} files</span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: total > 500 ? '#ef4444' : total > 200 ? '#f59e0b' : '#3b82f6', flexShrink: 0 }}>{total.toLocaleString()} Δ</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Security & Build Status ──────────────────────────── */}
          <div className="db-grid2" style={GRID2}>
            {/* Dependency Vulnerabilities */}
            <div style={CARD}>
              <h2 style={H2}><Ico>fad fa-shield-exclamation</Ico> Dependency Security</h2>
              {data.audit && (data.audit.backend?.critical + data.audit.backend?.high + data.audit.backend?.moderate + data.audit.backend?.low + data.audit.frontend?.critical + data.audit.frontend?.high + data.audit.frontend?.moderate + data.audit.frontend?.low) === 0 && (
                <EmptyState message="No vulnerabilities detected — all clear!" />
              )}
              {(['backend', 'frontend'] as const).map(area => {
                const a = data.audit?.[area];
                if (!a) return null;
                const total = a.critical + a.high + a.moderate + a.low;
                if (total === 0) return null;
                const statusColor = a.critical > 0 ? '#ef4444' : a.high > 0 ? '#f59e0b' : total > 0 ? '#3b82f6' : '#10b981';
                const statusLabel = a.critical > 0 ? 'CRITICAL' : a.high > 0 ? 'HIGH RISK' : total > 0 ? 'LOW RISK' : 'CLEAN';
                return (
                  <div key={area} style={{ marginBottom: '0.75rem', padding: '0.6rem', background: 'rgba(255,255,255,0.03)', borderRadius: 6, border: `1px solid ${statusColor}22` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize' }}>{area}</span>
                      <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 4, background: `${statusColor}18`, color: statusColor, fontWeight: 700 }}>{statusLabel}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {[
                        { label: 'Critical', val: a.critical, color: '#ef4444' },
                        { label: 'High', val: a.high, color: '#f97316' },
                        { label: 'Moderate', val: a.moderate, color: '#f59e0b' },
                        { label: 'Low', val: a.low, color: '#3b82f6' },
                      ].map(v => (
                        <span key={v.label} style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: 3, background: v.val > 0 ? `${v.color}15` : 'rgba(255,255,255,0.04)', color: v.val > 0 ? v.color : 'var(--text-secondary)' }}>
                          {v.label}: {v.val}
                        </span>
                      ))}
                    </div>
                    {a.details?.length > 0 && (
                      <div style={{ marginTop: 8, maxHeight: 160, overflow: 'auto', fontSize: '0.7rem' }}>
                        {a.details.map((d: D, i: number) => {
                          const sevColors: Record<string, string> = { critical: '#ef4444', high: '#f97316', moderate: '#f59e0b', low: '#3b82f6', info: '#6b7280' };
                          const c = sevColors[d.severity] || '#6b7280';
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', borderBottom: i < a.details.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0 }} />
                              <code style={{ color: c, fontWeight: 600, flexShrink: 0 }}>{d.name}</code>
                              <span title={d.via || d.severity} style={{ color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.via || d.severity}</span>
                              {d.fixAvailable && <span style={{ fontSize: '0.6rem', padding: '0 4px', borderRadius: 3, background: '#10b98118', color: '#10b981' }}>fix</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Build Health */}
            <div style={CARD}>
              <h2 style={H2}><Ico>fad fa-hammer</Ico> Build Health</h2>
              {(data.buildChecks || []).every((bc: D) => bc.ok) && (
                <EmptyState message="All builds compile cleanly — no errors!" />
              )}
              {(data.buildChecks || []).map((bc: D) => {
                if (bc.ok) return null;
                const color = bc.ok ? '#10b981' : '#ef4444';
                return (
                  <div key={bc.area} style={{ marginBottom: '0.75rem', padding: '0.6rem', background: 'rgba(255,255,255,0.03)', borderRadius: 6, border: `1px solid ${color}22` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize' }}>
                        <i className={`fas fa-${bc.ok ? 'check-circle' : 'times-circle'}`} style={{ color, marginRight: 6 }} />
                        {bc.area}
                      </span>
                      <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 4, background: `${color}18`, color, fontWeight: 700 }}>
                        {bc.ok ? 'COMPILES' : `${bc.errors} ERROR${bc.errors !== 1 ? 'S' : ''}`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: 3, background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>
                        tsc --noEmit
                      </span>
                      <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: 3, background: bc.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: bc.ok ? '#10b981' : '#ef4444' }}>
                        {bc.ok ? '0 errors' : `${bc.errors} error${bc.errors !== 1 ? 's' : ''}`}
                      </span>
                      <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: 3, background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>
                        strict mode
                      </span>
                    </div>
                    {!bc.ok && bc.errorSample?.length > 0 && (
                      <div style={{ marginTop: 6, fontSize: '0.65rem', color: '#fca5a5', fontFamily: 'monospace', maxHeight: 200, overflow: 'auto' }}>
                        {bc.errorSample.map((e: string, i: number) => <div key={i} style={{ padding: '1px 0' }}>{e}</div>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Branches, Migrations, API Docs ─────────────────── */}
          <div className="db-grid2" style={GRID2}>
            <div style={CARD}>
              <h2 id="sec-branches" style={H2}><Ico>fad fa-code-branch</Ico> Git Branches ({data.branches?.length || 0})</h2>
              {!data.branches?.length ? <EmptyState message="No branches found" /> : (
                <div style={SCROLLBOX}>
                  {(data.branches as D[]).map((b: D) => (
                    <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', padding: '3px 0' }}>
                      {b.isCurrent && <i className="fas fa-circle" style={{ color: '#10b981', fontSize: '0.4rem' }} />}
                      <code style={{ color: b.isCurrent ? '#6ee7b7' : '#93c5fd', flex: 1 }}>{b.name}</code>
                      <span style={{ ...SUB, whiteSpace: 'nowrap' }}>{b.author}</span>
                      <span style={{
                        fontSize: '0.65rem', padding: '1px 6px', borderRadius: 3, whiteSpace: 'nowrap',
                        background: b.daysAgo > 90 ? 'rgba(239,68,68,0.12)' : b.daysAgo > 30 ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
                        color: b.daysAgo > 90 ? '#ef4444' : b.daysAgo > 30 ? '#f59e0b' : '#10b981',
                      }}>
                        {b.daysAgo === 0 ? 'today' : `${b.daysAgo}d ago`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={CARD}>
              <h2 id="sec-migrations" style={H2}><Ico>fad fa-database</Ico> Prisma Migrations ({data.migrationStatus?.applied || 0} applied)</h2>
              {!data.migrationStatus?.migrations?.length ? <EmptyState message="No migrations found" /> : (<>
                {data.migrationStatus.pending > 0 ? (
                  <div style={{ fontSize: '0.75rem', padding: '4px 8px', marginBottom: 8, borderRadius: 4, background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                    <i className="fas fa-exclamation-triangle" style={{ marginRight: 4 }} />{data.migrationStatus.pending} pending migration{data.migrationStatus.pending !== 1 ? 's' : ''}
                  </div>
                ) : (
                  <EmptyState message="All migrations applied — schema up to date!" />
                )}
                <div style={SCROLLBOX}>
                  {(data.migrationStatus.migrations as D[]).map((m: D) => (
                    <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', padding: '2px 0' }}>
                      <i className={`fas fa-${m.applied ? 'check-circle' : 'clock'}`} style={{ color: m.applied ? '#10b981' : '#f59e0b', fontSize: '0.6rem' }} />
                      <code style={{ color: m.applied ? '#94a3b8' : '#fca5a5', fontSize: '0.7rem' }}>{m.name}</code>
                    </div>
                  ))}
                </div>
              </>)}
            </div>
          </div>

          <div style={{ ...CARD, marginBottom: '1.5rem' }}>
            <h2 style={H2}><Ico>fad fa-book</Ico> API Documentation ({data.apiDocCoverage?.documented || 0}/{data.apiDocCoverage?.total || 0})</h2>
            {!data.apiDocCoverage || data.apiDocCoverage.total === 0 ? <EmptyState message="No endpoints found" /> : (<>
              <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: '0.75rem' }}>
                <div style={{
                  width: `${data.apiDocCoverage.total > 0 ? (data.apiDocCoverage.documented / data.apiDocCoverage.total) * 100 : 0}%`,
                  height: '100%', borderRadius: 4,
                  background: data.apiDocCoverage.documented === data.apiDocCoverage.total ? 'linear-gradient(to right, #10b981, #34d399)' : 'linear-gradient(to right, #f59e0b, #fbbf24)',
                  transition: 'width 0.5s',
                }} />
              </div>
              {data.apiDocCoverage.undocumented?.length > 0 ? (
                <div style={SCROLLBOX}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Undocumented endpoints:</div>
                  {(data.apiDocCoverage.undocumented as string[]).map((ep: string, i: number) => (
                    <div key={i} style={{ fontSize: '0.7rem', padding: '2px 0', color: '#fca5a5' }}>
                      <code>{ep}</code>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="All endpoints documented — nice work!" />
              )}
            </>)}
          </div>

          {/* ── Heatmap ────────────────────────────────────────────── */}
          <div id="sec-heatmap" style={{ ...CARD, marginBottom: '1.5rem', overflow: 'auto' }}>
            <h2 style={H2}><Ico>fad fa-fire</Ico> Contribution Activity (Last 52 Weeks)</h2>
            <Heatmap data={data.heatmap} />
          </div>

          {/* ── Daily + Weekly ─────────────────────────────────────── */}
          <div id="sec-activity" className="db-grid2" style={GRID2}>
            <div style={CARD}>
              <h2 style={H2}><Ico>fad fa-chart-bar</Ico> Daily Commits</h2>
              <BarChart data={data.dailyCommits.map((d: D) => ({ label: fmtDate(d.date), value: d.count }))} />
              <div style={{ display: 'flex', justifyContent: 'space-between', ...SUB, marginTop: 6 }}>
                <span>{data.dailyCommits[0]?.date && fmtDate(data.dailyCommits[0].date)}</span><span>{data.dailyCommits.at(-1)?.date && fmtDate(data.dailyCommits.at(-1).date)}</span>
              </div>
            </div>
            <div style={CARD}>
              <h2 style={H2}><Ico>fad fa-chart-line</Ico> Weekly Trend</h2>
              <BarChart data={data.weeklyCommits.map((d: D) => ({ label: d.week, value: d.count }))} color="linear-gradient(to top,#10b981,#34d399)" />
              <div style={{ display: 'flex', justifyContent: 'space-between', ...SUB, marginTop: 6 }}>
                <span>{data.weeklyCommits[0]?.week}</span><span>{data.weeklyCommits.at(-1)?.week}</span>
              </div>
            </div>
          </div>

          {/* ── Activity Patterns ──────────────────────────────────── */}
          <div className="db-grid2" style={GRID2}>
            <div style={CARD}>
              <h2 style={H2}><Ico>fad fa-clock</Ico> Activity by Hour</h2>
              <BarChart data={(data.activityByHour as number[]).map((v: number, i: number) => ({ label: `${i}:00`, value: v }))} maxBars={24} color="linear-gradient(to top,#f59e0b,#fbbf24)" />
              <div style={{ display: 'flex', justifyContent: 'space-between', ...SUB, marginTop: 6 }}><span>0:00</span><span>12:00</span><span>23:00</span></div>
            </div>
            <div style={CARD}>
              <h2 style={H2}><Ico>fad fa-calendar-day</Ico> Activity by Day</h2>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 110, width: '100%' }}>
                {(data.activityByDay as number[]).map((v: number, i: number) => {
                  const max = Math.max(...(data.activityByDay as number[]), 1);
                  return (
                    <div key={i} style={{ flex: 1, height: `${(v / max) * 100}%`, background: 'linear-gradient(to top,#ec4899,#f472b6)', borderRadius: '3px 3px 0 0', minHeight: v > 0 ? 3 : 1, transition: 'height 0.3s' }} title={`${DAYS[i]}: ${v}`} />
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 4, ...SUB, marginTop: 6 }}>
                {DAYS.map(d => <span key={d} style={{ flex: 1, textAlign: 'center' }}>{d}</span>)}
              </div>
            </div>
          </div>

          {/* ── Language + Area + File Types ────────────────────────── */}
          <div id="sec-languages" />
          <div className="db-grid3" style={GRID3}>
            <div style={CARD}>
              <h2 style={H2}><Ico>fad fa-globe</Ico> Language Breakdown</h2>
              <LangBar loc={data.loc} />
            </div>
            <div style={CARD}>
              <h2 style={H2}><Ico>fad fa-folder-open</Ico> LOC by Area</h2>
              <Donut label="lines" segments={[
                { label: 'Frontend', value: data.locByArea.frontend, color: '#3b82f6' },
                { label: 'Backend', value: data.locByArea.backend, color: '#10b981' },
                { label: 'Widget', value: data.locByArea.widget, color: '#f59e0b' },
                ...(data.locByArea.shell ? [{ label: 'Shell', value: data.locByArea.shell, color: '#e879f9' }] : []),
              ]} />
            </div>
            <div style={CARD}>
              <h2 style={H2}><Ico>fad fa-file-lines</Ico> File Types</h2>
              <Donut label="files" segments={[
                { label: '.tsx', value: data.fileTypes.tsx, color: '#3178c6' },
                { label: '.ts', value: data.fileTypes.ts, color: '#60a5fa' },
                { label: '.module.css', value: data.fileTypes.moduleCss, color: '#563d7c' },
                { label: '.css', value: data.fileTypes.plainCss, color: '#a78bfa' },
                { label: '.js', value: data.fileTypes.js, color: '#f7df1e' },
                ...(data.fileTypes.sh ? [{ label: '.sh', value: data.fileTypes.sh, color: '#e879f9' }] : []),
              ]} size={110} />
            </div>
          </div>

          {/* ── Architecture Overview ──────────────────────────────── */}
          <div id="sec-architecture" style={{ ...CARD, marginBottom: '1.5rem' }}>
            <h2 style={H2}><Ico>fad fa-building</Ico> Architecture Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
              {[
                { label: 'Components', value: data.architecture.components, icon: 'fad fa-puzzle-piece' },
                { label: 'Hooks', value: data.architecture.hooks, icon: 'fad fa-link' },
                { label: 'Contexts', value: data.architecture.contexts, icon: 'fad fa-sync-alt' },
                { label: 'API Routes', value: data.architecture.apiRoutes, icon: 'fad fa-route' },
                { label: 'Middleware', value: data.architecture.middleware, icon: 'fad fa-shield' },
                { label: 'Utilities', value: data.architecture.utils, icon: 'fad fa-wrench' },
                { label: 'Pages', value: data.architecture.pages, icon: 'fad fa-file-lines' },
                { label: 'DB Models', value: data.architecture.dbModels, icon: 'fad fa-database' },
                { label: 'Migrations', value: data.architecture.dbMigrations, icon: 'fad fa-clipboard-list' },
                { label: 'Socket Lines', value: data.architecture.socketHandlerLines, icon: 'fad fa-plug' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Ico>{item.icon}</Ico>
                  <span style={{ fontWeight: 700, minWidth: 24 }}>{item.value}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Components + Hooks + Contexts ──────────────────────── */}
          <div className="db-grid2" style={GRID2}>
            <div style={{ ...CARD, display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ ...H2, cursor: 'pointer', userSelect: 'none' }}>
                <Ico>fad fa-puzzle-piece</Ico> {`Components (${data.components.length})`}
              </h2>
              <div style={{ flex: 1, position: 'relative', minHeight: 200 }}>
                <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {data.components.map((c: D) => (
                    <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontSize: '0.78rem', flexShrink: 0 }}>
                      <code style={{ color: '#60a5fa', minWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.name}>{c.name}</code>
                      <MiniBar value={c.lines} max={data.components[0]?.lines || 1} />
                      <span style={{ ...SUB, minWidth: 48, textAlign: 'right' }}>{c.lines.toLocaleString()}</span>
                      <span className="db-badges" style={{ display: 'flex', gap: 3, minWidth: 70 }}>
                        {c.hasTest && <Badge color="#10b981">test</Badge>}
                        {c.hasStory && <Badge color="#f59e0b">story</Badge>}
                        {c.hasCss && <Badge color="#8b5cf6">css</Badge>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Section title={`Hooks (${data.hooks.length})`} icon="fad fa-link">
                <div style={SCROLLBOX}>
                  {data.hooks.map((h: D) => (
                    <div key={h.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem' }}>
                      <code title={h.name} style={{ color: '#c084fc', minWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</code>
                      <MiniBar value={h.lines} max={data.hooks[0]?.lines || 1} color="#8b5cf6" />
                      <span style={{ ...SUB, minWidth: 40, textAlign: 'right' }}>{h.lines}</span>
                    </div>
                  ))}
                </div>
              </Section>
              <Section title={`Contexts (${data.contexts.length})`} icon="fad fa-sync-alt">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {data.contexts.map((c: D) => (
                    <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem' }}>
                      <code title={c.name} style={{ color: '#fbbf24', minWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</code>
                      <MiniBar value={c.lines} max={data.contexts[0]?.lines || 1} color="#f59e0b" />
                      <span style={{ ...SUB, minWidth: 40, textAlign: 'right' }}>{c.lines}</span>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          </div>

          {/* ── API Endpoints + Socket Events ──────────────────────── */}
          <div id="sec-endpoints" className="db-grid2" style={{ ...GRID2, marginTop: '1rem' }}>
            <Section title={`API Endpoints (${data.endpoints.length})`} icon="fad fa-network-wired">
              <div style={SCROLLBOX}>
                {data.endpoints.map((ep: D, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', padding: '2px 0' }}>
                    <MethodBadge method={ep.method} />
                    <code style={{ color: '#6ee7b7', flex: 1 }}>{ep.path}</code>
                    <span style={SUB}>{ep.file.split('/').pop()}</span>
                  </div>
                ))}
              </div>
            </Section>
            <Section title={`Socket Events (${data.socketEvents.length})`} icon="fad fa-plug" id="sec-socket">
              <div style={SCROLLBOX}>
                {data.socketEvents.map((ev: D, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', padding: '2px 0' }}>
                    <Badge color={ev.direction === 'emit' ? '#3b82f6' : '#10b981'}>{ev.direction}</Badge>
                    <code style={{ color: ev.direction === 'emit' ? '#93c5fd' : '#6ee7b7', flex: 1 }}>{ev.event}</code>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          {/* ── Routes + DB Models + Pages ──────────────────────────── */}
          <div className="db-grid3" style={{ ...GRID3, marginTop: '1rem' }}>
            <Section title="API Routes" icon="fad fa-route">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {data.routes.map((r: D) => (
                  <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem' }}>
                    <code style={{ color: '#6ee7b7', flex: 1 }}>{r.name}</code>
                    <MiniBar value={r.lines} max={data.routes[0]?.lines || 1} color="#10b981" />
                    <span style={SUB}>{r.lines}</span>
                  </div>
                ))}
              </div>
            </Section>
            <Section title="Database" icon="fad fa-database">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.prismaModels.map((m: D) => (
                  <div key={m.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <Pill>{m.name}</Pill>
                    <span style={SUB}>{m.fields} fields{m.relations > 0 && ` · ${m.relations} rel`}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', ...SUB, marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                  <span>{data.prismaComplexity.totalFields} fields</span>
                  <span>{data.prismaComplexity.totalRelations} relations</span>
                  <span>{data.prismaComplexity.avgFieldsPerModel} avg/model</span>
                  <span>{data.architecture.dbMigrations} migrations</span>
                </div>
              </div>
            </Section>
            <Section title="Pages" icon="fad fa-file-lines" id="sec-pages">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {data.pages.map((p: string) => <div key={p} style={{ fontSize: '0.78rem' }}><code style={{ color: '#67e8f9' }}>/{p}</code></div>)}
              </div>
            </Section>
          </div>

          {/* ── Environment Info ────────────────────────────────────── */}
          <div style={{ ...CARD, marginTop: '1rem', marginBottom: '1.5rem' }}>
            <h2 style={H2}><Ico>fad fa-cog</Ico> Environment</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
              {[
                { label: 'Chatr', value: `v${version}` },
                { label: 'SHA', value: data.overview.latestHash },
                { label: 'Node.js', value: data.env.nodeVersion },
                { label: 'npm', value: data.env.npmVersion },
                { label: 'Git', value: data.env.gitVersion },
                { label: 'Next.js', value: data.env.nextVersion },
                { label: 'Prisma', value: data.env.prismaVersion },
                { label: 'TypeScript', value: data.env.typescriptVersion },
                { label: 'OS', value: data.env.os },
              ].filter(e => e.value).map(e => (
                <div key={e.label} style={{ fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{e.label} </span>
                  <code style={{ color: '#60a5fa', fontWeight: 600 }}>{e.value}</code>
                </div>
              ))}
            </div>
          </div>

          {/* ── Contributors ───────────────────────────────────────── */}
          <Section title={`Contributors (${data.contributors.length})`} icon="fad fa-users" defaultOpen={true} id="sec-contributors">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.contributors.map((c: D, i: number) => {
                const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];
                return (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: colors[i % 5], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div style={SUB}>{c.firstCommit && fmtDate(c.firstCommit)} → {c.lastCommit && fmtDate(c.lastCommit)}</div>
                    </div>
                    <MiniBar value={c.commits} max={data.contributors[0]?.commits || 1} color={colors[i % 5]} />
                    <span style={{ fontWeight: 700, minWidth: 40, textAlign: 'right' }}>{c.commits}</span>
                    <span style={SUB}>commits</span>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* ── Commit Message Analytics ────────────────────────────── */}
          <div className="db-grid2" style={{ ...GRID2, marginTop: '1rem' }}>
            <Section title="Commit Message Analytics" icon="fad fa-comment-dots">
              <div style={{ marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                Average message length: <strong>{data.commitStats.avgMsgLength} chars</strong>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6 }}>Most used words:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {data.commitStats.topWords.map((w: D, i: number) => (
                  <span key={w.word} style={{
                    fontSize: `${Math.max(0.65, Math.min(1.2, 0.65 + (1 - i / 20) * 0.55))}rem`,
                    padding: '2px 8px', borderRadius: 4,
                    background: `rgba(59,130,246,${0.1 + (1 - i / 20) * 0.15})`,
                    color: i < 5 ? '#60a5fa' : 'var(--text-secondary)',
                    fontWeight: i < 3 ? 600 : 400,
                  }}>
                    {w.word} <span style={{ opacity: 0.5 }}>{w.count}</span>
                  </span>
                ))}
              </div>
            </Section>

            {/* ── NPM Scripts ──────────────────────────────────────── */}
            <Section title="NPM Scripts" icon="fad fa-scroll">
              {(['root', 'frontend', 'backend'] as const).map(area => (
                <div key={area} style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize', marginBottom: 4 }}>{area}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {data.scripts[area].map((s: D) => (
                      <span key={s.name} title={s.command} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: '#93c5fd', cursor: 'default' }}>
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </Section>
          </div>

          {/* ── Dependencies + Largest + Recently Modified ──────────── */}
          <div className="db-grid3" style={{ ...GRID3, marginTop: '1rem' }}>
            <Section title={`Dependencies (${data.dependencies.total})`} icon="fad fa-box-open" id="sec-dependencies">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { label: 'Frontend', d: data.dependencies.frontend },
                  { label: 'Backend', d: data.dependencies.backend },
                  { label: 'Root', d: data.dependencies.root },
                ].map(({ label, d }) => (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 3 }}>
                      <span style={{ fontWeight: 600 }}>{label}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{d.prod}p + {d.dev}d</span>
                    </div>
                    <div style={{ display: 'flex', gap: 2, height: 8, borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${(d.prod / (d.prod + d.dev || 1)) * 100}%`, background: '#3b82f6' }} />
                      <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)' }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', ...SUB }}>
                <span><span style={{ color: '#3b82f6' }}>■</span> Prod</span>
                <span><span style={{ color: 'rgba(255,255,255,0.2)' }}>■</span> Dev</span>
              </div>
            </Section>

            <Section title="Largest Files" icon="fad fa-ruler-vertical" id="sec-largest">
              {data.largestFiles.length === 0 ? <EmptyState message="No file data available" /> : (
              <div style={{ ...SCROLLBOX, maxHeight: 240 }}>
                {data.largestFiles.map((f: D, i: number) => (
                  <div key={f.path} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
                    <span style={{ color: 'var(--text-secondary)', minWidth: 16, textAlign: 'right' }}>#{i + 1}</span>
                    <code style={{ color: '#fbbf24', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.path}>
                      {f.path.replace(/^(frontend\/src|backend\/src|widget-src)\//, '')}
                    </code>
                    <MiniBar value={f.lines} max={data.largestFiles[0]?.lines || 1} color="#f59e0b" />
                    <span style={{ ...SUB, minWidth: 42, textAlign: 'right' }}>{f.lines.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              )}
            </Section>

            <Section title="Recently Modified" icon="fad fa-clock">
              {data.recentlyModified.length === 0 ? <EmptyState message="No recently modified files" /> : (
              <div style={{ ...SCROLLBOX, maxHeight: 240 }}>
                {data.recentlyModified.map((f: string) => (
                  <div key={f} style={{ fontSize: '0.78rem', padding: '2px 0' }}>
                    <code style={{ color: '#67e8f9' }} title={f}>{f.replace(/^(frontend\/src|backend\/src|widget-src)\//, '')}</code>
                  </div>
                ))}
              </div>
              )}
            </Section>
          </div>

          {/* ── Code Churn + Stale Files ─────────────────────────── */}
          <div className="db-grid2" style={{ ...GRID2, marginTop: '1rem' }}>
            <Section title={`Code Churn — Hot Files (${data.codeChurn.length})`} icon="fad fa-fire-flame-curved">
              {data.codeChurn.length === 0 ? <EmptyState message="No file churn data available" /> : (
              <div style={SCROLLBOX}>
                {data.codeChurn.map((f: D, i: number) => (
                  <div key={f.file} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', padding: '2px 0' }}>
                    <span style={{ color: 'var(--text-secondary)', minWidth: 16, textAlign: 'right', fontSize: '0.65rem' }}>#{i + 1}</span>
                    <code style={{ color: '#fb923c', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.file}>
                      {f.file.replace(/^(frontend\/src|backend\/src|widget-src)\//, '')}
                    </code>
                    <MiniBar value={f.changes} max={data.codeChurn[0]?.changes || 1} color="#f97316" />
                    <span style={{ ...SUB, minWidth: 36, textAlign: 'right' }}>{f.changes}x</span>
                  </div>
                ))}
              </div>
              )}
            </Section>
            <Section title={`Stale Files (${data.staleFiles.length})`} icon="fad fa-hourglass-half">
              {data.staleFiles.length === 0 ? <EmptyState message="No stale files detected" /> : (
              <div style={SCROLLBOX}>
                {data.staleFiles.map((f: D) => (
                  <div key={f.file} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', padding: '2px 0' }}>
                    <code style={{ color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.file}>
                      {f.file.replace(/^(frontend\/src|backend\/src|widget-src)\//, '')}
                    </code>
                    <span style={{ ...SUB, flexShrink: 0 }}>{fmtDate(f.lastModified)}</span>
                  </div>
                ))}
              </div>
              )}
            </Section>
          </div>

          {/* ── Code Ownership ─────────────────────────────────────── */}
          <div style={{ ...CARD, marginTop: '1rem', marginBottom: '1rem' }}>
            <h2 style={H2}><Ico>fad fa-users-viewfinder</Ico> Code Ownership</h2>
              {data.codeOwnership.length === 0 ? <EmptyState message="No ownership data available" /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.codeOwnership.map((o: D, i: number) => {
                  const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];
                  const total = data.codeOwnership.reduce((s: number, x: D) => s + x.net, 0) || 1;
                  return (
                    <div key={o.author}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 3 }}>
                        <span style={{ fontWeight: 600 }}>{o.author}</span>
                        <span style={SUB}>+{o.added.toLocaleString()} / -{o.deleted.toLocaleString()} = <strong style={{ color: 'var(--text)' }}>{o.net.toLocaleString()}</strong> net</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min((o.net / total) * 100, 100)}%`, height: '100%', background: colors[i % colors.length], borderRadius: 3, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
          </div>

          {/* ── Backend Test Coverage + Untested Components ─────────── */}
          <div className="db-grid2" style={GRID2}>
            <Section title={`Backend Test Coverage (${data.backendTestedCount}/${data.backendModules?.length || 0})`} icon="fad fa-shield-check">
              {!data.backendModules || data.backendModules.length === 0 ? <EmptyState message="No backend modules found" /> : (<>
                <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: '0.75rem' }}>
                  <div style={{
                    width: `${data.backendModules.length > 0 ? (data.backendTestedCount / data.backendModules.length) * 100 : 0}%`,
                    height: '100%', borderRadius: 4,
                    background: 'linear-gradient(to right, #10b981, #34d399)',
                    transition: 'width 0.5s',
                  }} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  {['route', 'middleware', 'lib', 'service', 'socket'].map(cat => {
                    const items = (data.backendModules as D[]).filter((m: D) => m.category === cat);
                    if (items.length === 0) return null;
                    const tested = items.filter((m: D) => m.hasTest).length;
                    const color = tested === items.length ? '#10b981' : tested > 0 ? '#f59e0b' : '#ef4444';
                    return (
                      <span key={cat} style={{ fontSize: '0.65rem', padding: '2px 7px', borderRadius: 4, background: `${color}18`, color, fontWeight: 600 }}>
                        {cat}: {tested}/{items.length}
                      </span>
                    );
                  })}
                </div>
                <div style={SCROLLBOX}>
                  {(data.backendModules as D[]).map((m: D) => (
                    <div key={`${m.category}-${m.name}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', padding: '3px 0' }}>
                      <i className={`fas fa-${m.hasTest ? 'check-circle' : 'xmark-circle'}`}
                        style={{ color: m.hasTest ? '#10b981' : '#ef4444', fontSize: '0.65rem', width: 12 }} />
                      <code style={{ color: m.hasTest ? '#6ee7b7' : '#fca5a5', flex: 1 }}>{m.name}</code>
                      <Badge color={
                        m.category === 'route' ? '#3b82f6' :
                        m.category === 'middleware' ? '#8b5cf6' :
                        m.category === 'lib' ? '#06b6d4' :
                        m.category === 'service' ? '#f59e0b' :
                        '#ec4899'
                      }>{m.category}</Badge>
                      <span style={SUB}>{m.lines}</span>
                    </div>
                  ))}
                </div>
              </>)}
            </Section>
            <Section title={`Frontend Test Coverage (${data.frontendTestedCount ?? 0}/${data.frontendModules?.length || 0})`} icon="fad fa-shield-check">
              {!data.frontendModules || data.frontendModules.length === 0 ? <EmptyState message="No frontend modules found" /> : (<>
                <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: '0.75rem' }}>
                  <div style={{
                    width: `${data.frontendModules.length > 0 ? ((data.frontendTestedCount ?? 0) / data.frontendModules.length) * 100 : 0}%`,
                    height: '100%', borderRadius: 4,
                    background: 'linear-gradient(to right, #3b82f6, #60a5fa)',
                    transition: 'width 0.5s',
                  }} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  {['component', 'hook', 'context', 'util', 'page', 'widget'].map(cat => {
                    const items = (data.frontendModules as D[]).filter((m: D) => m.category === cat);
                    if (items.length === 0) return null;
                    const tested = items.filter((m: D) => m.hasTest).length;
                    const color = tested === items.length ? '#10b981' : tested > 0 ? '#f59e0b' : '#ef4444';
                    return (
                      <span key={cat} style={{ fontSize: '0.65rem', padding: '2px 7px', borderRadius: 4, background: `${color}18`, color, fontWeight: 600 }}>
                        {cat}: {tested}/{items.length}
                      </span>
                    );
                  })}
                </div>
                <div style={SCROLLBOX}>
                  {(data.frontendModules as D[]).map((m: D) => (
                    <div key={`${m.category}-${m.name}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', padding: '3px 0' }}>
                      <i className={`fas fa-${m.hasTest ? 'check-circle' : 'xmark-circle'}`}
                        style={{ color: m.hasTest ? '#10b981' : '#ef4444', fontSize: '0.65rem', width: 12 }} />
                      <code style={{ color: m.hasTest ? '#93c5fd' : '#fca5a5', flex: 1 }}>{m.name}</code>
                      <Badge color={
                        m.category === 'component' ? '#3b82f6' :
                        m.category === 'hook' ? '#8b5cf6' :
                        m.category === 'context' ? '#f59e0b' :
                        m.category === 'util' ? '#06b6d4' :
                        m.category === 'widget' ? '#f97316' :
                        '#ec4899'
                      }>{m.category}</Badge>
                      <span style={SUB}>{m.lines}</span>
                    </div>
                  ))}
                </div>
              </>)}
            </Section>
          </div>

          {/* ── TODO / FIXME + Test Distribution ───────────────────── */}
          <div className="db-grid2" style={{ ...GRID2, marginTop: '1rem' }}>
            <Section title={`TODOs & FIXMEs (${data.todos.length})`} icon="fad fa-thumbtack" id="sec-todos">
              {data.todos.length === 0 ? (
                <EmptyState message="No TODOs or FIXMEs — nice work!" />
              ) : (<>
                <div style={{ display: 'flex', gap: 8, marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  {Object.entries(data.todos.reduce((acc: Record<string, number>, t: D) => { acc[t.type] = (acc[t.type] || 0) + 1; return acc; }, {})).map(([type, count]) => (
                    <Badge key={type} color={TODO_COLORS[type] || '#94a3b8'}>{type}: {count as number}</Badge>
                  ))}
                </div>
                <div style={SCROLLBOX}>
                  {data.todos.map((t: D, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.75rem', padding: '3px 0', borderBottom: '1px solid var(--border)' }}>
                      <Badge color={TODO_COLORS[t.type] || '#94a3b8'}>{t.type}</Badge>
                      <span style={{ flex: 1, color: 'var(--text)' }}>{t.text}</span>
                      <code style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', whiteSpace: 'nowrap' }}>{t.file.split('/').pop()}:{t.line}</code>
                    </div>
                  ))}
                </div>
              </>)}
            </Section>
            <Section title="Test Distribution" icon="fad fa-flask">
              <Donut label="test files" segments={[
                { label: 'Frontend', value: data.testBreakdown.frontend, color: '#3b82f6' },
                { label: 'Backend', value: data.testBreakdown.backend, color: '#10b981' },
                { label: 'Widget', value: data.testBreakdown.widget, color: '#f59e0b' },
              ]} size={100} />
            </Section>
          </div>

          {/* ── Test Results ──────────────────────────────────────── */}
          {(() => {
            const anyRunning = feRunning || beRunning;
            const hasReport = feReport || beReport;
            const allSuitesRaw = [
              ...(feReport?.suites || []).map((s: D) => ({ ...s, area: 'frontend' })),
              ...(beReport?.suites || []).map((s: D) => ({ ...s, area: 'backend' })),
            ];
            const liveUnitResults: D[] = [
              ...(feLive?.liveResults || []).map((r: D) => ({ ...r, area: 'frontend' })),
              ...(beLive?.liveResults || []).map((r: D) => ({ ...r, area: 'backend' })),
            ];
            const failedCount = hasReport
              ? allSuitesRaw.reduce((s: number, su: D) => s + su.tests.filter((t: D) => t.status !== 'passed').length, 0)
              : liveUnitResults.filter((t: D) => t.status === 'failed').length;
            const allSuites = (() => {
              if (unitFilter === 'all') return allSuitesRaw;
              if (unitFilter === 'failed') return allSuitesRaw.map((s: D) => {
                const ft = s.tests.filter((t: D) => t.status !== 'passed');
                return ft.length ? { ...s, tests: ft, duration: ft.reduce((sum: number, t: D) => sum + (t.duration || 0), 0) } : null;
              }).filter(Boolean);
              return allSuitesRaw.filter((s: D) => s.area === unitFilter);
            })();
            const feCount = feReport ? (feReport.summary?.total || 0) : liveUnitResults.filter((t: D) => t.area === 'frontend').length;
            const beCount = beReport ? (beReport.summary?.total || 0) : liveUnitResults.filter((t: D) => t.area === 'backend').length;
            const hasData = hasReport || liveUnitResults.length > 0;
            const unitFilterOptions = [
              { id: 'all', label: 'All', count: feCount + beCount },
              ...((feReport || feRunning) ? [{ id: 'frontend', label: 'Frontend', count: feCount }] : []),
              ...((beReport || beRunning) ? [{ id: 'backend', label: 'Backend', count: beCount }] : []),
              ...(failedCount > 0 ? [{ id: 'failed', label: 'Failed', count: failedCount }] : []),
            ];
            const total = allSuites.reduce((s: number, su: D) => s + su.tests.length, 0);
            const passed = allSuites.reduce((s: number, su: D) => s + su.tests.filter((t: D) => t.status === 'passed').length, 0);
            const failed = total - passed;
            const flaky = allSuites.reduce((s: number, su: D) => s + su.tests.filter((t: D) => (t.retries || 0) > 0).length, 0);
            const suiteCount = allSuites.length;
            const duration = allSuites.reduce((s: number, su: D) => s + (su.duration || 0), 0);
            const combinedLive = (anyRunning && (feLive || beLive)) ? {
              elapsed: Math.max(feLive?.elapsed || 0, beLive?.elapsed || 0),
              liveResults: [
                ...(feLive?.liveResults || []).map((r: D) => ({ ...r, area: 'frontend' })),
                ...(beLive?.liveResults || []).map((r: D) => ({ ...r, area: 'backend' })),
              ].sort((a: D, b: D) => a.timestamp - b.timestamp),
              liveSummary: {
                completed: (feLive?.liveSummary?.completed || 0) + (beLive?.liveSummary?.completed || 0),
                passed: (feLive?.liveSummary?.passed || 0) + (beLive?.liveSummary?.passed || 0),
                failed: (feLive?.liveSummary?.failed || 0) + (beLive?.liveSummary?.failed || 0),
              },
            } : null;
            const feCov = feReport?.coverage;
            const beCov = beReport?.coverage;

            return (
              <div id="sec-test-results" style={{ ...CARD, marginTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: 8 }}>
                  <h2 style={{ ...H2, margin: 0 }}><Ico>fad fa-vial</Ico> Test Results</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {hasData && <FilterPills options={unitFilterOptions} value={unitFilter} onChange={setUnitFilter} />}
                    {failedCount > 0 && !anyRunning && (
                      <button onClick={() => runFreshTests(undefined, true)}
                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: '0.75rem', color: '#ef4444' }}>
                        <i className="fas fa-redo" style={{ marginRight: 4 }} /> Re-run Failed
                      </button>
                    )}
                    <button onClick={() => runFreshTests()}
                      disabled={anyRunning}
                      style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 6, padding: '3px 10px', cursor: anyRunning ? 'wait' : 'pointer', fontSize: '0.75rem', color: '#10b981', opacity: anyRunning ? 0.6 : 1 }}>
                      {anyRunning ? <><i className="fad fa-spinner-third fa-spin" style={{ marginRight: 4 }} /> Running...</> : <><i className="fas fa-play" style={{ marginRight: 4 }} /> Run All</>}
                    </button>
                  </div>
                </div>

                {!hasReport && !anyRunning && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <i className="fad fa-flask" style={{ fontSize: '1.5rem', display: 'block', marginBottom: 8, opacity: 0.4 }} />
                    No test results yet. Click <strong>Run All</strong> to execute frontend & backend tests.
                  </div>
                )}

                {anyRunning && !hasReport && (() => {
                  if (!combinedLive || combinedLive.liveResults.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        <i className="fad fa-spinner-third fa-spin" style={{ fontSize: '1.5rem', display: 'block', marginBottom: 8 }} />
                        Starting frontend & backend tests...
                      </div>
                    );
                  }
                  const filteredResults = unitFilter === 'all' ? combinedLive.liveResults
                    : unitFilter === 'failed' ? combinedLive.liveResults.filter((t: D) => t.status === 'failed')
                    : combinedLive.liveResults.filter((t: D) => t.area === unitFilter);
                  const filteredLive = { ...combinedLive, liveResults: filteredResults, liveSummary: { completed: filteredResults.length, passed: filteredResults.filter((t: D) => t.status === 'passed').length, failed: filteredResults.filter((t: D) => t.status === 'failed').length } };
                  return <LiveTestFeed live={filteredLive} color="#8b5cf6" />;
                })()}

                {hasReport && (
                  <div>
                    {anyRunning && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem', padding: '6px 12px', borderRadius: 6, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', fontSize: '0.78rem', color: '#a78bfa' }}>
                        <i className="fad fa-spinner-third fa-spin" />
                        {feRunning && !beRunning && 'Frontend tests still running...'}
                        {!feRunning && beRunning && 'Backend tests still running...'}
                        {feRunning && beRunning && 'Tests still running...'}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: failed === 0 ? '#10b981' : '#ef4444' }}>{passed}/{total}</div>
                        <div style={SUB}>tests passed</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>{suiteCount}</div>
                        <div style={SUB}>suites</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#8b5cf6' }}>{fmtMs(duration)}</div>
                        <div style={SUB}>duration</div>
                      </div>
                      {failed > 0 && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{failed}</div>
                          <div style={SUB}>failed</div>
                        </div>
                      )}
                      {flaky > 0 && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{flaky}</div>
                          <div style={SUB}>flaky</div>
                        </div>
                      )}
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: failed === 0 ? '#10b981' : '#ef4444', boxShadow: `0 0 8px ${failed === 0 ? '#10b981' : '#ef4444'}` }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: failed === 0 ? '#10b981' : '#ef4444' }}>
                          {failed === 0 ? 'ALL PASSING' : 'FAILURES DETECTED'}
                        </span>
                      </div>
                    </div>

                    <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: '1rem' }}>
                      <div style={{ width: `${total > 0 ? (passed / total) * 100 : 0}%`, height: '100%', borderRadius: 4, transition: 'width 0.5s', background: failed === 0 ? 'linear-gradient(to right, #10b981, #34d399)' : 'linear-gradient(to right, #10b981, #f59e0b, #ef4444)' }} />
                    </div>

                    {(feCov || beCov) && (
                      <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        {feCov && (
                          <div>
                            <div style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 600, marginBottom: 4 }}>FRONTEND COVERAGE</div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                              {(['statements', 'branches', 'functions', 'lines'] as const).map(key => (
                                <div key={key} style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: feCov[key] >= 80 ? '#10b981' : feCov[key] >= 50 ? '#f59e0b' : '#ef4444' }}>{feCov[key]}%</div>
                                  <div style={{ ...SUB, textTransform: 'capitalize', fontSize: '0.6rem' }}>{key}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {beCov && (
                          <div>
                            <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600, marginBottom: 4 }}>BACKEND COVERAGE</div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                              {(['statements', 'branches', 'functions', 'lines'] as const).map(key => (
                                <div key={key} style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: beCov[key] >= 80 ? '#10b981' : beCov[key] >= 50 ? '#f59e0b' : '#ef4444' }}>{beCov[key]}%</div>
                                  <div style={{ ...SUB, textTransform: 'capitalize', fontSize: '0.6rem' }}>{key}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ ...SCROLLBOX, maxHeight: 400 }}>
                      {allSuites.map((suite: D) => (
                        <SuiteRow key={`${suite.area}-${suite.file}-${unitFilter}`} suite={suite} area={suite.area} defaultOpen={unitFilter === 'failed'} />
                      ))}
                    </div>

                    <div style={{ ...SUB, marginTop: 8, textAlign: 'right' }}>
                      {feReport?.generatedAt && <>FE: {new Date(feReport.generatedAt).toLocaleTimeString()}</>}
                      {feReport?.generatedAt && beReport?.generatedAt && ' · '}
                      {beReport?.generatedAt && <>BE: {new Date(beReport.generatedAt).toLocaleTimeString()}</>}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── E2E Test Results ────────────────────────────────────── */}
          {(() => {
            const liveResults: D[] = e2eLive?.liveResults || [];
            const reportTests: D[] = e2eReport ? (e2eReport.suites || []).flatMap((s: D) => s.tests) : [];
            const allTests = e2eReport ? reportTests : liveResults;
            const allProjects: string[] = [...new Set(allTests.map((t: D) => t.project).filter(Boolean))];
            const failedCount = allTests.filter((t: D) => t.status !== 'passed' && t.status !== 'running').length;
            const flakyCount = allTests.filter((t: D) => (t.retries || 0) > 0 && t.status === 'passed').length;
            const retriedCount = allTests.filter((t: D) => (t.retries || 0) > 0).length;
            const hasData = e2eReport || liveResults.length > 0;
            const e2eFilterOptions = [
              { id: 'all', label: 'All', count: allTests.length },
              ...allProjects.map((p: string) => ({
                id: p,
                label: p === 'chromium' ? 'Chrome' : p === 'mobile' ? 'Mobile' : p.charAt(0).toUpperCase() + p.slice(1),
                count: allTests.filter((t: D) => t.project === p).length,
              })),
              ...(failedCount > 0 ? [{ id: 'failed', label: 'Failed', count: failedCount }] : []),
              ...(flakyCount > 0 ? [{ id: 'flaky', label: 'Flaky', count: flakyCount }] : []),
              ...(retriedCount > 0 ? [{ id: 'retried', label: 'Retried', count: retriedCount }] : []),
            ];

            const filterTest = (t: D) => {
              if (e2eFilter === 'all') return true;
              if (e2eFilter === 'failed') return t.status !== 'passed';
              if (e2eFilter === 'flaky') return (t.retries || 0) > 0 && t.status === 'passed';
              if (e2eFilter === 'retried') return (t.retries || 0) > 0;
              return t.project === e2eFilter;
            };

            const filteredE2ESuites = e2eReport ? (e2eReport.suites || []).map((s: D) => {
              if (e2eFilter === 'all') return s;
              const filtered = s.tests.filter(filterTest);
              if (filtered.length === 0) return null;
              return { ...s, tests: filtered, duration: filtered.reduce((sum: number, t: D) => sum + (t.duration || 0), 0) };
            }).filter(Boolean) : [];

            const filteredLiveResults = liveResults.filter(filterTest);

            const e2eSummary = e2eFilter === 'all' && e2eReport ? e2eReport.summary : (() => {
              const tests = e2eReport ? filteredE2ESuites.flatMap((s: D) => s.tests) : filteredLiveResults;
              const p = tests.filter((t: D) => t.status === 'passed').length;
              const f = tests.filter((t: D) => t.status === 'failed').length;
              const fl = tests.filter((t: D) => (t.retries || 0) > 0).length;
              const dur = tests.reduce((s: number, t: D) => s + (t.duration || 0), 0);
              return { total: tests.length, passed: p, failed: f, flaky: fl, suites: e2eReport ? filteredE2ESuites.length : 0, duration: dur };
            })();

            return (
          <div id="sec-e2e" style={{ ...CARD, marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: 8 }}>
              <h2 style={{ ...H2, margin: 0 }}><Ico>fad fa-browser</Ico> E2E Tests (Playwright)</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {hasData && <FilterPills options={e2eFilterOptions} value={e2eFilter} onChange={setE2eFilter} />}
                <button onClick={startE2E} disabled={e2eRunning}
                  style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 6, padding: '3px 10px', cursor: e2eRunning ? 'wait' : 'pointer', fontSize: '0.75rem', color: '#a855f7', opacity: e2eRunning ? 0.6 : 1 }}>
                  {e2eRunning ? <><i className="fad fa-spinner-third fa-spin" style={{ marginRight: 4 }} /> Running...</> : <><i className="fas fa-play" style={{ marginRight: 4 }} /> Run E2E</>}
                </button>
              </div>
            </div>

            {!e2eReport && !e2eRunning && !e2eLive && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <i className="fad fa-browser" style={{ fontSize: '1.5rem', display: 'block', marginBottom: 8, opacity: 0.4 }} />
                No E2E results yet. Click <strong>Run E2E</strong> to execute all Playwright tests.
              </div>
            )}

            {e2eRunning && !e2eReport && (
              filteredLiveResults.length > 0 ? (
                <LiveE2EFeed expandAll={e2eFilter === 'failed' || e2eFilter === 'flaky' || e2eFilter === 'retried'} live={{ ...e2eLive, liveResults: filteredLiveResults, liveSummary: { completed: filteredLiveResults.length, passed: filteredLiveResults.filter((t: D) => t.status === 'passed').length, failed: filteredLiveResults.filter((t: D) => t.status === 'failed').length, retrying: filteredLiveResults.filter((t: D) => (t.retries || 0) > 0).length } }} />
              ) : e2eLive?.liveResults?.length > 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  No results match the current filter.
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  <i className="fad fa-spinner-third fa-spin" style={{ fontSize: '1.5rem', display: 'block', marginBottom: 8 }} />
                  Starting E2E tests...
                </div>
              )
            )}

            {e2eReport && (
              <div>
                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: e2eSummary.failed === 0 ? '#10b981' : '#ef4444' }}>
                      {e2eSummary.passed}/{e2eSummary.total}
                    </div>
                    <div style={SUB}>tests passed</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#a855f7' }}>{e2eSummary.suites}</div>
                    <div style={SUB}>suites</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#8b5cf6' }}>{fmtMs(e2eSummary.duration)}</div>
                    <div style={SUB}>test time</div>
                  </div>
                  {(e2eReport?.summary?.elapsed || e2eSummary.elapsed) && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6366f1' }}>{fmtMs(e2eReport?.summary?.elapsed || e2eSummary.elapsed)}</div>
                      <div style={SUB}>wall clock</div>
                    </div>
                  )}
                  {e2eSummary.failed > 0 && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{e2eSummary.failed}</div>
                      <div style={SUB}>failed</div>
                    </div>
                  )}
                  {(e2eSummary.flaky || 0) > 0 && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{e2eSummary.flaky}</div>
                      <div style={SUB}>flaky</div>
                    </div>
                  )}
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: e2eSummary.failed === 0 ? '#10b981' : '#ef4444',
                      boxShadow: `0 0 8px ${e2eSummary.failed === 0 ? '#10b981' : '#ef4444'}`,
                    }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: e2eSummary.failed === 0 ? '#10b981' : '#ef4444' }}>
                      {e2eSummary.failed === 0 ? 'ALL PASSING' : 'FAILURES DETECTED'}
                    </span>
                  </div>
                </div>

                <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: '1rem' }}>
                  <div style={{
                    width: `${e2eSummary.total > 0 ? (e2eSummary.passed / e2eSummary.total) * 100 : 0}%`,
                    height: '100%', borderRadius: 4, transition: 'width 0.5s',
                    background: e2eSummary.failed === 0
                      ? 'linear-gradient(to right, #a855f7, #c084fc)'
                      : 'linear-gradient(to right, #a855f7, #f59e0b, #ef4444)',
                  }} />
                </div>

                <div style={{ ...SCROLLBOX, maxHeight: 400 }}>
                  {filteredE2ESuites.map((suite: D) => (
                    <SuiteRow key={`${suite.file}-${e2eFilter}`} suite={suite} defaultOpen={e2eFilter === 'failed' || e2eFilter === 'flaky' || e2eFilter === 'retried'} />
                  ))}
                </div>

                {e2eReport.generatedAt && (
                  <div style={{ ...SUB, marginTop: 8, textAlign: 'right' }}>
                    Results from {new Date(e2eReport.generatedAt).toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </div>
            );
          })()}

          {/* ── Commit Size Graph ──────────────────────────────────── */}
          {data.recentCommits.length > 0 && (() => {
            const commits = [...data.recentCommits].reverse();
            const maxLines = Math.max(...commits.map((c: D) => Math.max(c.added || 0, c.deleted || 0)), 1);
            const maxFiles = Math.max(...commits.map((c: D) => c.files || 0), 1);
            const W = 960, H = 260, PAD = 50, GRAPH_TOP = 40, GRAPH_H = 140, BAR_ZONE = 40;
            const baseline = GRAPH_TOP + GRAPH_H;
            const step = commits.length > 1 ? (W - PAD * 2) / (commits.length - 1) : 0;
            const barW = Math.max(3, Math.min(10, step * 0.4));
            const sqrtMax = Math.sqrt(maxLines);
            const toY = (v: number) => {
              if (v <= 0) return baseline;
              return baseline - (Math.sqrt(v) / sqrtMax) * GRAPH_H;
            };
            // Commit type colors
            const typeColors: Record<string, string> = {
              feat: '#10b981', fix: '#ef4444', chore: '#6b7280', test: '#3b82f6',
              refactor: '#8b5cf6', docs: '#06b6d4', style: '#ec4899', perf: '#f59e0b',
              ci: '#14b8a6', build: '#f97316',
            };
            const getType = (msg: string) => {
              const m = msg.match(/^(\w+)[\s(:!]/);
              const t = m ? m[1].toLowerCase() : 'other';
              return ['feat', 'fix', 'chore', 'test', 'docs', 'style', 'refactor', 'perf', 'ci', 'build'].includes(t) ? t : 'other';
            };
            const addedPts = commits.map((c: D, i: number) => `${PAD + i * step},${toY(c.added || 0)}`).join(' ');
            const deletedPts = commits.map((c: D, i: number) => `${PAD + i * step},${toY(c.deleted || 0)}`).join(' ');
            // Net growth (cumulative)
            let cumNet = 0;
            const netData = commits.map((c: D) => { cumNet += (c.added || 0) - (c.deleted || 0); return cumNet; });
            const netMax = Math.max(Math.abs(Math.min(...netData)), Math.abs(Math.max(...netData)), 1);
            const netMid = 20;
            const netScale = 16;
            const toNetY = (v: number) => netMid - (v / netMax) * netScale;
            const netPts = netData.map((v, i) => `${PAD + i * step},${toNetY(v)}`).join(' ');
            // Grid lines
            const gridLines: number[] = [];
            const niceSteps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
            const targetLines = 5;
            const gridStep = niceSteps.find(s => maxLines / s <= targetLines) || Math.ceil(maxLines / targetLines);
            for (let v = gridStep; v <= maxLines; v += gridStep) gridLines.push(v);
            if (!gridLines.includes(maxLines) && maxLines > gridStep) gridLines.push(maxLines);
            return (
              <div style={{ marginTop: '1rem' }}>
                <Section title={`Commit Size (Last ${commits.length})`} icon="fad fa-chart-line">
                  <div style={{ overflowX: 'auto' }}>
                    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
                      {/* Grid */}
                      {gridLines.map((v, i) => (
                        <g key={i}>
                          <line x1={PAD} y1={toY(v)} x2={W - PAD} y2={toY(v)} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
                          <text x={PAD - 6} y={toY(v) + 4} textAnchor="end" fill="var(--text-secondary)" fontSize={9}>{v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : v % 1000 === 0 ? 0 : 1)}k` : v}</text>
                        </g>
                      ))}
                      {/* Files changed — subtle vertical bars behind everything */}
                      {commits.map((c: D, i: number) => {
                        const fh = maxFiles > 0 ? ((c.files || 0) / maxFiles) * GRAPH_H * 0.5 : 0;
                        return fh > 0 ? (
                          <rect key={`f${i}`} x={PAD + i * step - barW / 2} y={baseline - fh} width={barW} height={fh}
                            fill="rgba(148,163,184,0.08)" rx={1} />
                        ) : null;
                      })}
                      {/* Baseline */}
                      <line x1={PAD} y1={baseline} x2={W - PAD} y2={baseline} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
                      {/* Net per-commit bars below baseline */}
                      {commits.map((c: D, i: number) => {
                        const net = (c.added || 0) - (c.deleted || 0);
                        if (net === 0) return null;
                        const h = Math.min(BAR_ZONE - 4, Math.max(2, (Math.abs(net) / maxLines) * BAR_ZONE * 2));
                        return (
                          <rect key={`n${i}`} x={PAD + i * step - barW / 2} y={net > 0 ? baseline + 2 : baseline + 2}
                            width={barW} height={h} fill={net > 0 ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'} rx={1} />
                        );
                      })}
                      {/* Net growth sparkline at top */}
                      <line x1={PAD} y1={netMid} x2={W - PAD} y2={netMid} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
                      <polyline points={netPts} fill="none" stroke="#60a5fa" strokeWidth={1.5} opacity={0.6} />
                      <text x={W - PAD + 6} y={netMid + 3} fill="#60a5fa" fontSize={8} opacity={0.7}>net {cumNet >= 0 ? '+' : ''}{cumNet.toLocaleString()}</text>
                      {/* Main lines */}
                      <polyline points={deletedPts} fill="none" stroke="#f87171" strokeWidth={1} strokeDasharray="4 2" />
                      <polyline points={addedPts} fill="none" stroke="#34d399" strokeWidth={1.5} />
                      {/* Dots color-coded by commit type */}
                      {commits.map((c: D, i: number) => {
                        const type = getType(c.message);
                        const dotColor = typeColors[type] || '#94a3b8';
                        const cx = PAD + i * step;
                        return (
                          <g key={i}>
                            <circle cx={cx} cy={toY(c.added || 0)} r={2.5} fill="#34d399" stroke={dotColor} strokeWidth={1.5} />
                            <circle cx={cx} cy={toY(c.deleted || 0)} r={2} fill="#f87171" opacity={0.7} />
                            {/* Files badge for large commits */}
                            {(c.files || 0) > 20 && (
                              <text x={cx} y={toY(c.added || 0) - 6} textAnchor="middle" fill="#94a3b8" fontSize={7}>{c.files}f</text>
                            )}
                            <title>{`${c.hash} [${type}]: +${(c.added || 0).toLocaleString()} / -${(c.deleted || 0).toLocaleString()} (${c.files || 0} files)\nnet: ${((c.added || 0) - (c.deleted || 0)).toLocaleString()}\n${c.message}`}</title>
                          </g>
                        );
                      })}
                      {/* Right-side labels */}
                      <text x={W - PAD + 6} y={baseline + BAR_ZONE / 2 + 3} fill="var(--text-secondary)" fontSize={7} opacity={0.5}>net/commit</text>
                    </svg>
                  </div>
                  <div style={{ display: 'flex', gap: '1.2rem', marginTop: 6, fontSize: '0.72rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                    <span><span style={{ display: 'inline-block', width: 12, height: 3, background: '#34d399', borderRadius: 2, marginRight: 5 }} />Insertions</span>
                    <span><span style={{ display: 'inline-block', width: 12, height: 3, background: '#f87171', borderRadius: 2, marginRight: 5, borderTop: '1px dashed #f87171' }} />Deletions</span>
                    <span><span style={{ display: 'inline-block', width: 12, height: 2, background: '#60a5fa', borderRadius: 2, marginRight: 5, opacity: 0.6 }} />Cumulative Net</span>
                    <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'rgba(148,163,184,0.15)', borderRadius: 1, marginRight: 5 }} />Files Changed</span>
                    <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'rgba(52,211,153,0.3)', borderRadius: 1, marginRight: 5 }} />Net +/−</span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>dot ring = commit type</span>
                  </div>
                </Section>
              </div>
            );
          })()}

          {/* ── Recent Commits ─────────────────────────────────────── */}
          <div style={{ marginTop: '1rem' }}>
            <Section title={`Recent Commits (${data.recentCommits.length})`} icon="fad fa-history">
              {data.recentCommits.length === 0 ? <EmptyState message="No commits found" /> : (
              <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 320, overflow: 'auto', gap: 0 }}>
                {data.recentCommits.map((c: D, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0', borderBottom: i < data.recentCommits.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <code style={{ fontSize: '0.7rem', color: '#60a5fa', flexShrink: 0, fontWeight: 600 }}>{c.hash}</code>
                    <span title={c.message} style={{ fontSize: '0.82rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.message}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{c.files || 0}f</span>
                    <span style={{ fontSize: '0.7rem', color: '#34d399', flexShrink: 0 }}>+{(c.added || 0).toLocaleString()}</span>
                    <span style={{ fontSize: '0.7rem', color: '#f87171', flexShrink: 0 }}>-{(c.deleted || 0).toLocaleString()}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{c.author}</span>
                    <span style={{ ...SUB, flexShrink: 0 }}>{fmtDate(c.date)}</span>
                  </div>
                ))}
              </div>
              )}
            </Section>
          </div>

        </>)}
      </div>

      {showPasswordPrompt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={() => { setShowPasswordPrompt(false); setPendingAction(null); }}>
          <div style={{ background: 'var(--bg, #1e293b)', border: '1px solid var(--border, #334155)', borderRadius: 12, padding: '1.5rem', width: 360, maxWidth: '90vw' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 600 }}>
              <i className="fas fa-lock" style={{ marginRight: 8, color: '#f59e0b' }} />
              Test Runner Password
            </h3>
            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'var(--text-secondary, #94a3b8)' }}>
              Enter the dashboard password to run tests on production.
            </p>
            {passwordError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '0.5rem 0.75rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: '#ef4444' }}>
                <i className="fas fa-exclamation-triangle" style={{ marginRight: 6 }} />{passwordError}
              </div>
            )}
            <form onSubmit={e => {
              e.preventDefault();
              const input = (e.target as HTMLFormElement).elements.namedItem('pw') as HTMLInputElement;
              const pw = input.value.trim();
              if (!pw) return;
              setTestPassword(pw);
              setShowPasswordPrompt(false);
              setPasswordError('');
              if (pendingAction) { const fn = pendingAction; setPendingAction(null); setTimeout(() => fn(pw), 0); }
            }}>
              <input name="pw" type="password" autoFocus placeholder="Password"
                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid var(--border, #334155)', background: 'var(--bg-secondary, #0f172a)', color: 'inherit', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 8, marginTop: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowPasswordPrompt(false); setPendingAction(null); }}
                  style={{ padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid var(--border, #334155)', background: 'transparent', color: 'var(--text-secondary, #94a3b8)', cursor: 'pointer', fontSize: '0.85rem' }}>
                  Cancel
                </button>
                <button type="submit"
                  style={{ padding: '0.5rem 1rem', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                  <i className="fas fa-unlock" style={{ marginRight: 6 }} />Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
