'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { emojiData, CATEGORY_META, RECENT_KEY, MAX_RECENT, type EmojiItem } from './emojiData';
import styles from './EmojiPicker.module.css';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  openUpward?: boolean;
}

function getRecent(): EmojiItem[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRecent(item: EmojiItem) {
  try {
    const list = getRecent().filter(e => e.emoji !== item.emoji);
    localStorage.setItem(RECENT_KEY, JSON.stringify([item, ...list].slice(0, MAX_RECENT)));
  } catch {}
}

export default function EmojiPicker({ onSelect, onClose, openUpward = true }: EmojiPickerProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [activeCategory, setActiveCategory] = useState<string>('recent');
  const [search, setSearch] = useState('');
  const [recent, setRecent] = useState<EmojiItem[]>([]);
  const [closing, setClosing] = useState(false);

  const pickerRef   = useRef<HTMLDivElement>(null);
  const searchRef   = useRef<HTMLInputElement>(null);
  const scrollRef   = useRef<HTMLDivElement>(null);
  const tabBarRef   = useRef<HTMLDivElement>(null);
  // refs for each category GROUP (scroll target) and HEADING (observer target)
  const groupRefs   = useRef<Record<string, HTMLDivElement | null>>({});
  const headingRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // suppress observer while programmatic scroll is in flight
  const suppressObserver = useRef(false);

  const categories = ['recent', ...Object.keys(emojiData)];

  const dismiss = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => onClose(), 140);
  }, [closing, onClose]);

  // Load recent
  useEffect(() => {
    const r = getRecent();
    setRecent(r);
    if (r.length === 0) setActiveCategory('smileys');
  }, []);

  // Focus search on open
  useEffect(() => { setTimeout(() => searchRef.current?.focus(), 50); }, []);

  // Outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) dismiss();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [dismiss]);

  // Escape key
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [dismiss]);

  // IntersectionObserver — watch category headings, update active tab
  useEffect(() => {
    if (search.trim()) return; // don't track in search mode
    const root = scrollRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (suppressObserver.current) return;
        // Pick the heading closest to (but still below) the top of the container
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const cat = (visible[0].target as HTMLElement).dataset.cat;
          if (cat) setActiveCategory(cat);
        }
      },
      // Top band only: fires as soon as the heading hits within 24px of the top edge
      { root, rootMargin: '0px 0px -90% 0px', threshold: 0 }
    );

    Object.values(headingRefs.current).forEach(el => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [search]);

  // Scroll active tab button into view in the tab bar
  useEffect(() => {
    if (!tabBarRef.current) return;
    const btn = tabBarRef.current.querySelector(`[data-tab="${activeCategory}"]`) as HTMLElement | null;
    btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeCategory]);

  const handlePick = useCallback((item: EmojiItem) => {
    saveRecent(item);
    setRecent(getRecent());
    onSelect(item.emoji);
  }, [onSelect]);

  const handleTabClick = (cat: string) => {
    setSearch('');
    setActiveCategory(cat);
    const container = scrollRef.current;
    const group     = groupRefs.current[cat];
    if (!container || !group) return;
    suppressObserver.current = true;
    // Scroll the container so the group starts exactly at the top, smoothly
    container.scrollTo({ top: group.offsetTop, behavior: 'smooth' });
    setTimeout(() => { suppressObserver.current = false; }, 800);
  };

  // Search grouping
  const searchGroups = search.trim()
    ? Object.entries(emojiData)
        .map(([cat, items]) => ({
          cat,
          items: items.filter(e => {
            const q = search.toLowerCase();
            return e.name.includes(q) || e.keywords.some(k => k.includes(q));
          }),
        }))
        .filter(g => g.items.length > 0)
    : [];

  const totalSearchResults = searchGroups.reduce((s, g) => s + g.items.length, 0);

  // Theme tokens
  const bg       = isDark ? '#1e293b' : '#ffffff';
  const border   = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const text     = isDark ? '#f1f5f9' : '#0f172a';
  const subtle   = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const activeBg = isDark ? 'rgba(249,115,22,0.2)' : 'rgba(249,115,22,0.12)';
  const headingColor = isDark ? '#64748b' : '#94a3b8';

  const renderEmojiGrid = (items: EmojiItem[], keyPrefix: string) => (
    <div className={styles.emojiRow}>
      {items.map((item, i) => (
        <button
          key={`${keyPrefix}-${item.emoji}-${i}`}
          title={item.name}
          aria-label={item.name}
          onClick={() => handlePick(item)}
          className={styles.emojiBtn}
          style={{ '--hover-bg': subtle } as React.CSSProperties}
        >
          {item.emoji}
        </button>
      ))}
    </div>
  );

  return (
    <div
      ref={pickerRef}
      className={`${styles.picker}${closing ? ` ${styles.closing}` : ''}`}
      style={{
        backgroundColor: bg,
        border: `1px solid ${border}`,
        boxShadow: isDark ? '0 -8px 32px rgba(0,0,0,0.5)' : '0 -8px 32px rgba(0,0,0,0.15)',
        bottom: openUpward ? 'calc(100% + 8px)' : undefined,
        top: openUpward ? undefined : 'calc(100% + 8px)',
      }}
    >
      {/* ── Category tab bar ── */}
      <div
        ref={tabBarRef}
        className={styles.categoryBar}
        style={{ borderBottom: `1px solid ${border}`, backgroundColor: bg }}
        role="tablist"
        aria-label="Emoji categories"
      >
        {categories.map(cat => {
          const meta = CATEGORY_META[cat];
          const isActive = activeCategory === cat && !search.trim();
          return (
            <button
              key={cat}
              data-tab={cat}
              role="tab"
              aria-selected={isActive}
              aria-label={meta.label}
              title={meta.label}
              onClick={() => handleTabClick(cat)}
              className={styles.catBtn}
              style={{
                color: isActive ? '#f97316' : (isDark ? '#64748b' : '#94a3b8'),
                backgroundColor: isActive ? activeBg : 'transparent',
                borderBottom: isActive ? '2px solid #f97316' : '2px solid transparent',
              }}
            >
              <i className={meta.icon} aria-hidden="true" />
            </button>
          );
        })}
      </div>

      {/* ── Search ── */}
      <div className={styles.searchRow} style={{ borderBottom: `1px solid ${border}` }}>
        <i className="fas fa-search" aria-hidden="true" style={{ color: headingColor, fontSize: '12px', flexShrink: 0 }} />
        <input
          ref={searchRef}
          type="search"
          role="searchbox"
          aria-label="Search emojis"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search emojis…"
          className={styles.searchInput}
          style={{ backgroundColor: 'transparent', color: text }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className={styles.searchClear}
            aria-label="Clear search"
            style={{ color: headingColor }}
          >
            <i className="fas fa-times" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* ── Scrollable content ── */}
      <div ref={scrollRef} className={styles.grid} role="region" aria-label="Emoji list">

        {/* ── SEARCH MODE ── */}
        {search.trim() && (
          totalSearchResults === 0 ? (
            <div className={styles.empty} style={{ color: headingColor }}>
              <i className="fas fa-search" aria-hidden="true" style={{ fontSize: 24, marginBottom: 8 }} />
              <div>No emojis found</div>
            </div>
          ) : (
            searchGroups.map(({ cat, items }) => (
              <div key={cat} className={styles.group}>
                <div className={styles.groupHeading} style={{ color: headingColor, backgroundColor: bg }}>
                  <i className={CATEGORY_META[cat].icon} aria-hidden="true" style={{ marginRight: 5 }} />
                  {CATEGORY_META[cat].label}
                  <span className={styles.groupCount}>{items.length}</span>
                </div>
                {renderEmojiGrid(items, `search-${cat}`)}
              </div>
            ))
          )
        )}

        {/* ── INFINITE SCROLL MODE ── */}
        {!search.trim() && categories.map(cat => {
          const items = cat === 'recent' ? recent : (emojiData[cat] ?? []);
          if (cat === 'recent' && items.length === 0) return null;
          return (
            <div
              key={cat}
              ref={el => { groupRefs.current[cat] = el; }}
              className={styles.group}
            >
              {/* Sticky heading — observed by IntersectionObserver */}
              <div
                ref={el => { headingRefs.current[cat] = el; }}
                data-cat={cat}
                className={styles.stickyHeading}
                style={{ color: headingColor, backgroundColor: bg }}
              >
                <i className={CATEGORY_META[cat].icon} aria-hidden="true" style={{ marginRight: 6 }} />
                {CATEGORY_META[cat].label}
              </div>
              {renderEmojiGrid(items, cat)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
