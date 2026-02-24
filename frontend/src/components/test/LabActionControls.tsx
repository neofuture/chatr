'use client';

interface Props {
  isDark: boolean;
  testRecipientId: string;
  ghostTypingEnabled: boolean;
  onGhostTypingToggle: (val: boolean) => void;
}

export default function LabActionControls({
  isDark, testRecipientId, ghostTypingEnabled,
  onGhostTypingToggle,
}: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

      {/* ── Ghost Typing Toggle ───────────────────────── */}
      {testRecipientId && (
        <div style={{
          marginBottom: '20px', padding: '12px', borderRadius: '8px',
          backgroundColor: isDark ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.05)',
          border: `1px solid ${ghostTypingEnabled ? '#8b5cf6' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)')}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}><i className="fas fa-ghost" /> Ghost Typing</div>
              <div style={{ fontSize: '11px', opacity: 0.7 }}>Show typing in real-time</div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
              <input type="checkbox" checked={ghostTypingEnabled} onChange={(e) => onGhostTypingToggle(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, cursor: 'pointer',
                backgroundColor: ghostTypingEnabled ? '#8b5cf6' : '#94a3b8', transition: '0.3s', borderRadius: '24px',
              }}>
                <span style={{ position: 'absolute', height: '18px', width: '18px', left: ghostTypingEnabled ? '23px' : '3px', bottom: '3px', backgroundColor: 'white', transition: '0.3s', borderRadius: '50%' }} />
              </span>
            </label>
          </div>
        </div>
      )}

    </div>
  );
}
