'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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

// ---------------------------------------------------------------------------
// Icon helper (Font Awesome)
// ---------------------------------------------------------------------------
function Ico({ children, size = 16 }: { children: string; size?: number }) {
  return <i className={children} style={{ fontSize: size, lineHeight: 1, flexShrink: 0, width: size, textAlign: 'center' }} />;
}

// ---------------------------------------------------------------------------
// Reusable small components
// ---------------------------------------------------------------------------

function StatCard({ label, value, sub, icon, color }: { label: string; value: string | number; sub?: string; icon: string; color: string }) {
  return (
    <div style={{ ...CARD, display: 'flex', alignItems: 'center', gap: '1rem', transition: 'transform 0.15s, box-shadow 0.15s', cursor: 'default' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0, color: '#fff' }}>
        <i className={icon} />
      </div>
      <div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.1, color: 'var(--text)' }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: 1 }}>{sub}</div>}
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
  const total = loc.typescript + loc.css + loc.javascript;
  if (!total) return null;
  const segs = [
    { label: 'TypeScript', value: loc.typescript, color: '#3178c6' },
    { label: 'CSS', value: loc.css, color: '#563d7c' },
    { label: 'JavaScript', value: loc.javascript, color: '#f7df1e' },
  ];
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
          <path d="M 8 40 A 32 32 0 0 1 72 40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} strokeLinecap="round" />
          <path d="M 8 40 A 32 32 0 0 1 72 40" fill="none" stroke={color} strokeWidth={6} strokeLinecap="round"
            strokeDasharray={`${pct} ${100 - pct}`} style={{ transition: 'stroke-dasharray 0.5s' }} />
        </svg>
      </div>
      <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: 4 }}>{value}{unit}</div>
    </div>
  );
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TODO_COLORS: Record<string, string> = { TODO: '#3b82f6', FIXME: '#ef4444', HACK: '#f59e0b', XXX: '#ec4899', WARN: '#f97316' };

function Section({ title, icon, children, defaultOpen = true, fill }: { title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean; fill?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ ...CARD, ...(fill ? { display: 'flex', flexDirection: 'column' as const, minHeight: 0, overflow: 'hidden' } : {}) }}>
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

  const fetchData = useCallback(() => {
    fetch(`${API}/api/dashboard`)
      .then(r => r.ok ? r.json() : Promise.reject('Failed to load'))
      .then(d => { setData(d); setLastRefresh(new Date()); setError(null); })
      .catch(e => setError(String(e)));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
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
    } as React.CSSProperties}>

      <style>{`
        @media (max-width: 768px) {
          .db-header { flex-direction: column !important; padding: 0.75rem 1rem !important; gap: 0.5rem !important; align-items: flex-start !important; }
          .db-header-right { flex-wrap: wrap !important; font-size: 0.7rem !important; gap: 0.5rem !important; }
          .db-header-branch { display: none !important; }
          .db-content { padding: 1rem 0.75rem 2rem !important; }
          .db-overview { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)) !important; gap: 0.5rem !important; }
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

      <div className="db-content" style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 2rem 3rem' }}>
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '1rem', color: '#fca5a5', marginBottom: '1rem' }}>{error}</div>}
        {!data && !error && <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}><div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}><i className="fad fa-spinner-third fa-spin" /></div>Loading metrics...</div>}

        {data && (<>

          {/* ── Overview Cards ──────────────────────────────────────── */}
          <div className="db-overview" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <StatCard label="Total Commits" value={data.overview.totalCommits} sub={`${data.health.commitsPerDay}/day avg`} icon="fas fa-code-commit" color="#3b82f6" />
            <StatCard label="Lines of Code" value={data.overview.totalLines} sub={`~${Math.round(data.overview.totalLines / 1000)}k`} icon="fas fa-laptop-code" color="#8b5cf6" />
            <StatCard label="Source Files" value={data.overview.totalFiles} sub={`${data.health.avgFileSize} avg loc`} icon="fas fa-folder" color="#06b6d4" />
            <StatCard label="Test Files" value={data.overview.testFiles} sub={`${data.health.testRatio}% ratio`} icon="fas fa-flask" color="#10b981" />
            <StatCard label="Days Active" value={data.overview.daysActive} icon="fas fa-calendar" color="#f59e0b" />
            <StatCard label="Dependencies" value={data.dependencies.total} icon="fas fa-box" color="#ec4899" />
            <StatCard label="Contributors" value={data.contributors.length} icon="fas fa-users" color="#6366f1" />
            <StatCard label="Commit Streak" value={data.commitStreaks.current} sub={`${data.commitStreaks.longest} day best`} icon="fas fa-fire-flame-curved" color="#ef4444" />
            <StatCard label="Branches" value={data.branchCount} icon="fas fa-code-branch" color="#14b8a6" />
            {data.tagCount > 0 && <StatCard label="Tags" value={data.tagCount} icon="fas fa-tag" color="#a855f7" />}
            {data.bundleSizeBytes > 0 && <StatCard label="Bundle Size" value={`${(data.bundleSizeBytes / 1048576).toFixed(0)}MB`} icon="fas fa-weight-hanging" color="#f97316" />}
          </div>

          {/* ── Code Health ────────────────────────────────────────── */}
          <div style={{ ...CARD, marginBottom: '1.5rem' }}>
            <h2 style={H2}><Ico>fad fa-heartbeat</Ico> Code Health</h2>
            <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '1rem' }}>
              <HealthGauge label="Avg File Size" value={data.health.avgFileSize} max={300} unit=" loc" color="#3b82f6" />
              <HealthGauge label="Test Ratio" value={data.health.testRatio} max={100} unit="%" color="#10b981" />
              <HealthGauge label="Component Tests" value={data.health.testCoverage} max={100} unit="%" color="#f59e0b" />
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

          {/* ── Heatmap ────────────────────────────────────────────── */}
          <div style={{ ...CARD, marginBottom: '1.5rem', overflow: 'auto' }}>
            <h2 style={H2}><Ico>fad fa-fire</Ico> Contribution Activity (Last 52 Weeks)</h2>
            <Heatmap data={data.heatmap} />
          </div>

          {/* ── Daily + Weekly ─────────────────────────────────────── */}
          <div className="db-grid2" style={GRID2}>
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
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 110, justifyContent: 'center' }}>
                {(data.activityByDay as number[]).map((v: number, i: number) => {
                  const max = Math.max(...(data.activityByDay as number[]), 1);
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 32, height: `${(v / max) * 90}px`, background: 'linear-gradient(to top,#ec4899,#f472b6)', borderRadius: '4px 4px 0 0', minHeight: 3, transition: 'height 0.3s' }} title={`${DAYS[i]}: ${v}`} />
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{DAYS[i]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Language + Area + File Types ────────────────────────── */}
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
              ]} size={110} />
            </div>
          </div>

          {/* ── Architecture Overview ──────────────────────────────── */}
          <div style={{ ...CARD, marginBottom: '1.5rem' }}>
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
            <Section title={`Components (${data.components.length})`} icon="fad fa-puzzle-piece" fill>
              <div style={{ ...SCROLLBOX, flex: 1, maxHeight: 'none', minHeight: 0 }}>
                {data.components.map((c: D) => (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontSize: '0.78rem' }}>
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
            </Section>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Section title={`Hooks (${data.hooks.length})`} icon="fad fa-link">
                <div style={SCROLLBOX}>
                  {data.hooks.map((h: D) => (
                    <div key={h.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem' }}>
                      <code style={{ color: '#c084fc', minWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</code>
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
                      <code style={{ color: '#fbbf24', minWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</code>
                      <MiniBar value={c.lines} max={data.contexts[0]?.lines || 1} color="#f59e0b" />
                      <span style={{ ...SUB, minWidth: 40, textAlign: 'right' }}>{c.lines}</span>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          </div>

          {/* ── API Endpoints + Socket Events ──────────────────────── */}
          <div className="db-grid2" style={{ ...GRID2, marginTop: '1rem' }}>
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
            <Section title={`Socket Events (${data.socketEvents.length})`} icon="fad fa-plug">
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
            <Section title="Pages" icon="fad fa-file-lines">
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
          <Section title={`Contributors (${data.contributors.length})`} icon="fad fa-users" defaultOpen={true}>
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
            <Section title={`Dependencies (${data.dependencies.total})`} icon="fad fa-box-open">
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

            <Section title="Largest Files" icon="fad fa-ruler-vertical">
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
            </Section>

            <Section title="Recently Modified" icon="fad fa-clock">
              <div style={{ ...SCROLLBOX, maxHeight: 240 }}>
                {data.recentlyModified.map((f: string) => (
                  <div key={f} style={{ fontSize: '0.78rem', padding: '2px 0' }}>
                    <code style={{ color: '#67e8f9' }} title={f}>{f.replace(/^(frontend\/src|backend\/src|widget-src)\//, '')}</code>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          {/* ── Code Churn + Stale Files ─────────────────────────── */}
          <div className="db-grid2" style={{ ...GRID2, marginTop: '1rem' }}>
            <Section title={`Code Churn — Hot Files (${data.codeChurn.length})`} icon="fad fa-fire-flame-curved">
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
            </Section>
            <Section title={`Stale Files (${data.staleFiles.length})`} icon="fad fa-hourglass-half">
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
            </Section>
          </div>

          {/* ── Code Ownership + Components Without Tests ──────────── */}
          <div className="db-grid2" style={{ ...GRID2, marginTop: '1rem' }}>
            <Section title="Code Ownership" icon="fad fa-users-viewfinder">
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
            </Section>
            <Section title={`Untested Components (${data.componentsWithoutTests.length})`} icon="fad fa-triangle-exclamation">
              {data.componentsWithoutTests.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '1rem 0', textAlign: 'center' }}>
                  <i className="fad fa-check-circle" style={{ fontSize: '1.5rem', marginBottom: 6, display: 'block', opacity: 0.5 }} />
                  All components have tests!
                </div>
              ) : (
                <div style={SCROLLBOX}>
                  {data.componentsWithoutTests.map((c: D) => (
                    <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', padding: '2px 0' }}>
                      <i className="fas fa-xmark" style={{ color: '#ef4444', fontSize: '0.65rem', width: 12 }} />
                      <code style={{ color: '#fca5a5', flex: 1 }}>{c.name}</code>
                      <span style={SUB}>{c.lines} lines</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>

          {/* ── TODO / FIXME + Test Distribution ───────────────────── */}
          <div className="db-grid2" style={{ ...GRID2, marginTop: '1rem' }}>
            <Section title={`TODOs & FIXMEs (${data.todos.length})`} icon="fad fa-thumbtack">
              {data.todos.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '1rem 0', textAlign: 'center' }}>
                  <i className="fad fa-check-circle" style={{ fontSize: '1.5rem', marginBottom: 6, display: 'block', opacity: 0.5 }} />
                  No TODOs or FIXMEs — nice work!
                </div>
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

          {/* ── Recent Commits ─────────────────────────────────────── */}
          <div style={{ marginTop: '1rem' }}>
            <Section title={`Recent Commits (${data.recentCommits.length})`} icon="fad fa-history">
              <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 320, overflow: 'auto', gap: 0 }}>
                {data.recentCommits.map((c: D, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0', borderBottom: i < data.recentCommits.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <code style={{ fontSize: '0.7rem', color: '#60a5fa', flexShrink: 0, fontWeight: 600 }}>{c.hash}</code>
                    <span style={{ fontSize: '0.82rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.message}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{c.author}</span>
                    <span style={{ ...SUB, flexShrink: 0 }}>{fmtDate(c.date)}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>

        </>)}
      </div>
    </div>
  );
}
