'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';
import styles from './WidgetDemo.module.css';
import { getApiBase } from '@/lib/api';

const API_URL = getApiBase();

type WidgetTheme = 'auto' | 'dark' | 'light';

interface Preset {
  label: string;
  a: string;
  b: string;
}

const PRESETS: Preset[] = [
  { label: 'Orange',  a: '#f97316', b: '#c23000' },
  { label: 'Blue',    a: '#3b82f6', b: '#1d4ed8' },
  { label: 'Purple',  a: '#8b5cf6', b: '#5b21b6' },
  { label: 'Green',   a: '#10b981', b: '#047857' },
  { label: 'Pink',    a: '#ec4899', b: '#9d174d' },
  { label: 'Teal',    a: '#14b8a6', b: '#0f766e' },
  { label: 'Red',     a: '#ef4444', b: '#991b1b' },
  { label: 'Amber',   a: '#f59e0b', b: '#b45309' },
];

function isValidHex(h: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(h);
}

export default function WidgetDemoPage() {
  const { theme } = useTheme();
  const [c1, setC1] = useState('#f97316');
  const [c2, setC2] = useState('#c23000');
  const [hex1, setHex1] = useState('#F97316');
  const [hex2, setHex2] = useState('#C23000');
  const [activePreset, setActivePreset] = useState(0);
  const [copied, setCopied] = useState(false);
  const [widgetTheme, setWidgetTheme] = useState<WidgetTheme>('auto');
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLocal = typeof window !== 'undefined'
    ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    : true;

  // ── Widget lifecycle ────────────────────────────────────────────────────────
  const reloadWidget = useCallback((color1: string, color2: string, wTheme: WidgetTheme) => {
    if (typeof window === 'undefined') return;

    // 1. Remove widget DOM elements
    ['chatr-widget-btn', 'chatr-widget-panel'].forEach((id) => {
      document.getElementById(id)?.remove();
    });

    // 2. Remove injected widget <style>
    document.head.querySelectorAll('style').forEach((s) => {
      if (s.textContent?.includes('#chatr-widget-btn')) s.remove();
    });

    // 3. Reset state
    (window as any).__chatrWidgetLoaded = false;
    (window as any).ChatrWidgetConfig = {
      apiUrl: API_URL,
      title: 'Chatr Support',
      greeting: "Hi there 👋 Need help? We're here!",
      accentColor: color1,
      accentColor2: color2,
      theme: wTheme,
    };

    // 4. Re-inject script with cache-bust — direct from backend, no Next.js proxy cache
    document.getElementById('chatr-widget-script')?.remove();
    const s = document.createElement('script');
    s.id = 'chatr-widget-script';
    s.src = `${API_URL}/widget/chatr.js?t=${Date.now()}`;
    s.setAttribute('data-accent-color', color1);
    s.setAttribute('data-accent-color-2', color2);
    s.setAttribute('data-theme', wTheme);
    document.body.appendChild(s);
  }, []);

  const debounceReload = useCallback((color1: string, color2: string, wTheme: WidgetTheme) => {
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = setTimeout(() => reloadWidget(color1, color2, wTheme), 300);
  }, [reloadWidget]);

  // Initial widget load
  useEffect(() => {
    (window as any).ChatrWidgetConfig = {
      apiUrl: API_URL,
      title: 'Chatr Support',
      greeting: "Hi there 👋 Need help? We're here!",
      theme: 'auto',
    };
    // Load directly from backend to bypass Next.js proxy cache
    const s = document.createElement('script');
    s.id = 'chatr-widget-script';
    s.src = `${API_URL}/widget/chatr.js?t=${Date.now()}`;
    s.setAttribute('data-accent-color', '#f97316');
    s.setAttribute('data-accent-color-2', '#c23000');
    s.setAttribute('data-theme', 'auto');
    document.body.appendChild(s);

    return () => {
      document.getElementById('chatr-widget-script')?.remove();
      document.getElementById('chatr-widget-btn')?.remove();
      document.getElementById('chatr-widget-panel')?.remove();
      document.head.querySelectorAll('style').forEach((st) => {
        if (st.textContent?.includes('#chatr-widget-btn')) st.remove();
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Colour change handlers ──────────────────────────────────────────────────
  function applyColours(a: string, b: string, presetIndex: number | null) {
    setC1(a); setHex1(a.toUpperCase());
    setC2(b); setHex2(b.toUpperCase());
    setActivePreset(presetIndex ?? -1);
    reloadWidget(a, b, widgetTheme);
  }

  function handlePick1(val: string) {
    setC1(val); setHex1(val.toUpperCase());
    setActivePreset(-1);
    debounceReload(val, c2, widgetTheme);
  }

  function handleHex1(val: string) {
    setHex1(val);
    const v = val.startsWith('#') ? val : '#' + val;
    if (isValidHex(v)) { setC1(v); setActivePreset(-1); debounceReload(v, c2, widgetTheme); }
  }

  function handlePick2(val: string) {
    setC2(val); setHex2(val.toUpperCase());
    setActivePreset(-1);
    debounceReload(c1, val, widgetTheme);
  }

  function handleHex2(val: string) {
    setHex2(val);
    const v = val.startsWith('#') ? val : '#' + val;
    if (isValidHex(v)) { setC2(v); setActivePreset(-1); debounceReload(c1, v, widgetTheme); }
  }

  function handleWidgetTheme(t: WidgetTheme) {
    setWidgetTheme(t);
    reloadWidget(c1, c2, t);
  }

  // ── Snippet ─────────────────────────────────────────────────────────────────
  const themeAttr = widgetTheme !== 'auto' ? `\n        data-theme="${widgetTheme}"` : '';
  const snippetText = `<script src="${API_URL}/widget/chatr.js"\n        data-accent-color="${c1}"\n        data-accent-color-2="${c2}"${themeAttr}></script>`;

  function handleCopy() {
    const themeAttrInline = widgetTheme !== 'auto' ? ` data-theme="${widgetTheme}"` : '';
    const oneLine = `<script src="${API_URL}/widget/chatr.js" data-accent-color="${c1}" data-accent-color-2="${c2}"${themeAttrInline}></script>`;
    navigator.clipboard.writeText(oneLine).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const gradientStyle = `linear-gradient(135deg, ${c1}, ${c2})`;

  return (
    <div className={styles.page} data-theme={theme}>
      {/* Header */}
      <header className={styles.header}>
        <span className={styles.headerTitle}>💬 Chatr Widget Demo</span>
        <div className={styles.headerRight}>
          <span className={`${styles.modeBadge} ${isLocal ? styles.dev : styles.prod}`}>
            {isLocal ? '⚡ Dev' : '✓ Production'}
          </span>
          <ThemeToggle showLabel={false} />
        </div>
      </header>

      {/* Page content */}
      <main className={styles.main}>
        <div className={styles.intro}>
          <h1 className={styles.title}>Widget Palette Designer</h1>
          <p className={styles.subtitle}>
            Customise the widget colours and theme then copy the embed snippet to use on any site.
          </p>
        </div>

        {/* Palette card */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>🎨 Palette Designer</h2>

          {/* Gradient preview */}
          <div
            className={styles.gradientPreview}
            style={{ background: gradientStyle }}
            aria-label="Gradient preview"
          />

          {/* Two colour pickers */}
          <div className={styles.pickersRow}>
            {/* Colour 1 */}
            <div className={styles.pickerGroup}>
              <label className={styles.pickerLabel} htmlFor="pick1">Colour 1 — Start</label>
              <div className={styles.pickerRow}>
                <div className={styles.colourInputWrap} style={{ background: c1 }}>
                  <input
                    type="color"
                    id="pick1"
                    value={c1}
                    onChange={(e) => handlePick1(e.target.value)}
                    aria-label="Gradient start colour"
                  />
                </div>
                <input
                  type="text"
                  className={styles.hexInput}
                  value={hex1}
                  onChange={(e) => handleHex1(e.target.value)}
                  maxLength={7}
                  aria-label="Start colour hex value"
                  spellCheck={false}
                />
              </div>
            </div>

            {/* Colour 2 */}
            <div className={styles.pickerGroup}>
              <label className={styles.pickerLabel} htmlFor="pick2">Colour 2 — End</label>
              <div className={styles.pickerRow}>
                <div className={styles.colourInputWrap} style={{ background: c2 }}>
                  <input
                    type="color"
                    id="pick2"
                    value={c2}
                    onChange={(e) => handlePick2(e.target.value)}
                    aria-label="Gradient end colour"
                  />
                </div>
                <input
                  type="text"
                  className={styles.hexInput}
                  value={hex2}
                  onChange={(e) => handleHex2(e.target.value)}
                  maxLength={7}
                  aria-label="End colour hex value"
                  spellCheck={false}
                />
              </div>
            </div>
          </div>

          {/* Widget theme */}
          <div>
            <div className={styles.sectionLabel}>Widget Theme</div>
            <div className={styles.themeRow} role="radiogroup" aria-label="Widget theme">
              {(['auto', 'light', 'dark'] as WidgetTheme[]).map((t) => (
                <button
                  key={t}
                  className={`${styles.themeBtn} ${widgetTheme === t ? styles.themeBtnActive : ''}`}
                  onClick={() => handleWidgetTheme(t)}
                  aria-pressed={widgetTheme === t}
                  style={widgetTheme === t ? { borderColor: c1, color: c1 } : {}}
                >
                  {t === 'auto' ? '🌗 Auto' : t === 'light' ? '☀️ Light' : '🌙 Dark'}
                </button>
              ))}
            </div>
          </div>

          {/* Preset palettes */}
          <div>
            <div className={styles.sectionLabel}>Presets</div>
            <div className={styles.presetsGrid} role="radiogroup" aria-label="Colour presets">
              {PRESETS.map((p, i) => (
                <button
                  key={p.label}
                  className={`${styles.presetBtn} ${activePreset === i ? styles.presetActive : ''}`}
                  style={{ background: `linear-gradient(135deg, ${p.a}, ${p.b})` }}
                  title={p.label}
                  aria-label={p.label}
                  aria-pressed={activePreset === i}
                  onClick={() => applyColours(p.a, p.b, i)}
                />
              ))}
            </div>
          </div>

          {/* Snippet */}
          <div>
            <div className={styles.sectionLabel}>Embed snippet</div>
            <div
              className={`${styles.snippet} ${copied ? styles.snippetCopied : ''}`}
              style={{ color: c1 }}
              onClick={handleCopy}
              role="button"
              tabIndex={0}
              aria-label="Click to copy embed code"
              onKeyDown={(e) => e.key === 'Enter' && handleCopy()}
            >
              {snippetText}
              <span className={styles.snippetHint}>
                {copied ? '✓ Copied!' : 'Click to copy'}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
