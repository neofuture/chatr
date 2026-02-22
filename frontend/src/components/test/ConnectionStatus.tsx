'use client';

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

export default function ConnectionStatus({
  isDark, effectivelyOnline, manualOffline,
  isUserTyping, isRecipientTyping, isRecipientRecording, isRecipientListeningToMyAudio,
  onManualOfflineChange,
}: Props) {
  return (
    <div style={{
      marginBottom: '20px', padding: '16px',
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      borderRadius: '8px',
      border: `2px solid ${effectivelyOnline ? '#10b981' : '#ef4444'}`,
    }}>
      {/* API Config */}
      <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
        <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', opacity: 0.7 }}>
          <i className="fas fa-cog" style={{ marginRight: '6px' }} />API CONFIGURATION
        </div>
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

      {/* Connection dot */}
      <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', opacity: 0.7 }}>CONNECTION STATUS</div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '6px',
        backgroundColor: effectivelyOnline
          ? (isDark ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.1)')
          : (isDark ? 'rgba(239,68,68,0.2)'  : 'rgba(239,68,68,0.1)'),
      }}>
        <div style={{
          width: '10px', height: '10px', borderRadius: '50%',
          backgroundColor: effectivelyOnline ? '#10b981' : '#ef4444',
          animation: effectivelyOnline ? 'pulse 2s ease-in-out infinite' : 'none',
        }} />
        <div style={{ fontSize: '14px', fontWeight: '600', color: effectivelyOnline ? '#10b981' : '#ef4444' }}>
          {effectivelyOnline
            ? <><i className="fas fa-check-circle" /> Connected</>
            : <><i className="fas fa-times-circle" /> Disconnected</>}
        </div>
      </div>
      {manualOffline && <div style={{ marginTop: '6px', fontSize: '11px', opacity: 0.7, fontStyle: 'italic' }}>(Manually offline)</div>}

      {/* Manual Offline toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: '12px', marginTop: '12px',
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
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
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
          {isUserTyping && <div style={{ fontSize: '12px', marginBottom: '4px', opacity: 0.8 }}><i className="fas fa-keyboard" /> You are typing...</div>}
          {isRecipientTyping && <div style={{ fontSize: '12px', opacity: 0.8, color: '#f97316', marginBottom: '4px' }}><i className="fas fa-keyboard" /> Recipient is typing...</div>}
          {isRecipientRecording && (
            <div style={{ fontSize: '12px', opacity: 0.9, color: '#ef4444', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fas fa-microphone" style={{ animation: 'pulse 1s ease-in-out infinite' }} />
              Recipient is recording a voice note...
            </div>
          )}
          {isRecipientListeningToMyAudio && (
            <div style={{ fontSize: '12px', opacity: 0.9, color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fas fa-headphones" /> Recipient is listening to your voice note...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

