'use client';

import { useState, useRef, useEffect } from 'react';
import { version } from '@/version';

interface Props {
  isDark: boolean;
  effectivelyOnline: boolean;
  manualOffline: boolean;
  isUserTyping: boolean;
  isRecipientTyping: boolean;
  isRecipientRecording: boolean;
  isRecipientListeningToMyAudio: string | null;
  onManualOfflineChange: (val: boolean) => void;
}

export default function ApiConfigFloat({
  isDark, effectivelyOnline, manualOffline,
  isUserTyping, isRecipientTyping, isRecipientRecording, isRecipientListeningToMyAudio,
  onManualOfflineChange,
}: Props) {
  const STORAGE_KEY = 'apiConfigFloat:pos';

  const getInitialPos = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved) as { x: number; y: number };
    } catch { /* ignore */ }
    return { x: 16, y: 16 };
  };

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>(getInitialPos);
  const posRef = useRef(pos);
  const dragging = useRef(false);
  const hasDragged = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    posRef.current = pos;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  }, [pos]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      hasDragged.current = true;
      const x = Math.max(0, Math.min(window.innerWidth - 80, e.clientX - dragOffset.current.x));
      const y = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - dragOffset.current.y));
      setPos({ x, y });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // Called on mousedown for any draggable surface — skip interactive children
  const startDrag = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('input, select, a') || target.tagName === 'BUTTON') return;
    dragging.current = true;
    hasDragged.current = false;
    dragOffset.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y };
    e.preventDefault();
  };

  const bg = isDark ? '#1e293b' : '#ffffff';
  const border = `2px solid ${effectivelyOnline ? '#10b981' : '#ef4444'}`;
  const subtle = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const dot = (
    <span style={{
      width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
      backgroundColor: effectivelyOnline ? '#10b981' : '#ef4444',
      display: 'inline-block',
      animation: effectivelyOnline ? 'pulse 2s ease-in-out infinite' : 'none',
    }} />
  );

  return (
    <div
      style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 1000, width: open ? '300px' : 'auto' }}
    >
      {!open ? (
        // Collapsed pill — whole div is draggable, click opens
        <div
          onMouseDown={startDrag}
          onClick={() => { if (!hasDragged.current) setOpen(true); }}
          title="API Configuration — drag to move, click to open"
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 10px', borderRadius: '8px', border,
            backgroundColor: bg, cursor: 'grab',
            fontSize: '12px', fontWeight: '600',
            color: effectivelyOnline ? '#10b981' : '#ef4444',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            userSelect: 'none',
          }}
        >
          {dot}
          <i className="fas fa-cog" />
          <span>{effectivelyOnline ? 'Connected' : 'Disconnected'}</span>
        </div>
      ) : (
        // Expanded panel
        <div style={{
          backgroundColor: bg, border, borderRadius: '10px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.35)', overflow: 'hidden',
        }}>
          {/* Title bar — draggable */}
          <div
            onMouseDown={startDrag}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px', cursor: 'grab',
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              borderBottom: `1px solid ${subtle}`,
              userSelect: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', opacity: 0.8, pointerEvents: 'none' }}>
              <i className="fas fa-cog" />
              API CONFIGURATION
              {dot}
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', opacity: 0.6, padding: '0 2px', color: 'inherit' }}
              title="Collapse"
            >
              <i className="fas fa-times" />
            </button>
          </div>

          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '0' }}>
            {/* API Config rows */}
            <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: `1px solid ${subtle}` }}>
              {[
                { label: 'API URL', value: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001 (default)' },
                { label: 'WS URL',  value: process.env.NEXT_PUBLIC_WS_URL  || 'http://localhost:3001 (default)' },
                { label: 'App',     value: process.env.NEXT_PUBLIC_PRODUCT_NAME || 'Chatr (default)' },
                { label: 'Version', value: version },
                { label: 'Env',     value: process.env.NODE_ENV || 'unknown' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', gap: '8px', fontSize: '11px', marginBottom: '4px', fontFamily: 'monospace' }}>
                  <span style={{ opacity: 0.5, minWidth: '60px' }}>{label}:</span>
                  <span style={{ color: value.includes('default') ? '#f59e0b' : '#10b981', wordBreak: 'break-all' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Connection status */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '6px', opacity: 0.7 }}>CONNECTION STATUS</div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 8px', borderRadius: '6px',
                backgroundColor: effectivelyOnline
                  ? (isDark ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.1)')
                  : (isDark ? 'rgba(239,68,68,0.2)'  : 'rgba(239,68,68,0.1)'),
              }}>
                <div style={{
                  width: '9px', height: '9px', borderRadius: '50%', flexShrink: 0,
                  backgroundColor: effectivelyOnline ? '#10b981' : '#ef4444',
                  animation: effectivelyOnline ? 'pulse 2s ease-in-out infinite' : 'none',
                }} />
                <div style={{ fontSize: '13px', fontWeight: '600', color: effectivelyOnline ? '#10b981' : '#ef4444' }}>
                  {effectivelyOnline
                    ? <><i className="fas fa-check-circle" /> Connected</>
                    : <><i className="fas fa-times-circle" /> Disconnected</>}
                </div>
              </div>
              {manualOffline && <div style={{ marginTop: '4px', fontSize: '11px', opacity: 0.7, fontStyle: 'italic' }}>(Manually offline)</div>}
            </div>

            {/* Manual Offline toggle */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              paddingTop: '10px', marginTop: '2px', borderTop: `1px solid ${subtle}`,
            }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600' }}>Manual Offline</div>
                <div style={{ fontSize: '11px', opacity: 0.6 }}>Simulate offline mode</div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                <input type="checkbox" checked={manualOffline} onChange={(e) => onManualOfflineChange(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, cursor: 'pointer',
                  backgroundColor: manualOffline ? '#ef4444' : (isDark ? '#374151' : '#d1d5db'),
                  transition: '0.3s', borderRadius: '34px',
                }}>
                  <span style={{ position: 'absolute', height: '18px', width: '18px', left: manualOffline ? '23px' : '3px', bottom: '3px', backgroundColor: 'white', transition: '0.3s', borderRadius: '50%' }} />
                </span>
              </label>
            </div>

            {/* Live activity indicators */}
            {(isUserTyping || isRecipientTyping || isRecipientRecording || isRecipientListeningToMyAudio) && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${subtle}` }}>
                {isUserTyping && <div style={{ fontSize: '12px', marginBottom: '4px', opacity: 0.8 }}><i className="fas fa-keyboard" /> You are typing...</div>}
                {isRecipientTyping && <div style={{ fontSize: '12px', opacity: 0.8, color: '#f97316', marginBottom: '4px' }}><i className="fas fa-keyboard" /> Recipient is typing...</div>}
                {isRecipientRecording && (
                  <div style={{ fontSize: '12px', opacity: 0.9, color: '#ef4444', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fas fa-microphone" style={{ animation: 'pulse 1s ease-in-out infinite' }} />
                    Recipient recording a voice note...
                  </div>
                )}
                {isRecipientListeningToMyAudio && (
                  <div style={{ fontSize: '12px', opacity: 0.9, color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fas fa-headphones" /> Recipient listening to your voice note...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

