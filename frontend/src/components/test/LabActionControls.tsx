'use client';

import { useRef } from 'react';
import Input from '@/components/form-controls/Input/Input';
import Button from '@/components/form-controls/Button/Button';
import VoiceRecorder from '@/components/VoiceRecorder';

interface Props {
  isDark: boolean;
  effectivelyOnline: boolean;
  uploadingFile: boolean;
  testMessage: string;
  testRecipientId: string;
  ghostTypingEnabled: boolean;
  selectedFile: File | null;
  filePreviewUrl: string | null;
  onMessageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMessageSend: () => void;
  onGhostTypingToggle: (val: boolean) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  onPresenceUpdate: (status: 'online' | 'away') => void;
  onPresenceRequest: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileSend: () => void;
  onFileCancelSelection: () => void;
  onVoiceRecording: (blob: Blob, waveform: number[]) => void;
  onVoiceRecordingStart: () => void;
  onVoiceRecordingStop: () => void;
}

function SectionTitle({ icon, label }: { icon: string; label: string }) {
  return (
    <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
      <i className={icon} /> {label}
    </h3>
  );
}

export default function LabActionControls({
  isDark, effectivelyOnline, uploadingFile,
  testMessage, testRecipientId, ghostTypingEnabled,
  selectedFile, filePreviewUrl,
  onMessageChange, onMessageSend,
  onGhostTypingToggle, onTypingStart, onTypingStop,
  onPresenceUpdate, onPresenceRequest,
  onFileSelect, onFileSend, onFileCancelSelection,
  onVoiceRecording, onVoiceRecordingStart, onVoiceRecordingStop,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      {/* ── Send Message ──────────────────────────────── */}
      <div style={{ marginBottom: '20px' }}>
        <SectionTitle icon="fas fa-comments" label="Message Test" />
        <Input
          type="text" value={testMessage} onChange={onMessageChange}
          placeholder="Type test message"
          onKeyDown={(e) => { if (e.key === 'Enter') onMessageSend(); }}
          style={{ marginBottom: '8px' }}
        />
        <Button variant="orange" fullWidth onClick={onMessageSend} disabled={!effectivelyOnline}>Send Message</Button>
        <div style={{ marginTop: '10px' }}>
          <input ref={fileInputRef} type="file" onChange={onFileSelect} style={{ display: 'none' }}
            accept="image/*,.pdf,.doc,.docx,.txt,.zip,.mp3,.wav,.ogg,.m4a,audio/*" />
          <Button variant="blue" fullWidth onClick={() => fileInputRef.current?.click()}
            disabled={!effectivelyOnline || uploadingFile} icon={<i className="fas fa-paperclip" />}>
            {uploadingFile ? 'Uploading...' : 'Attach File/Image'}
          </Button>
        </div>
        {selectedFile && (
          <div style={{
            marginTop: '12px', padding: '12px', borderRadius: '8px',
            backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)',
            border: '1px solid #3b82f6',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '8px' }}>
                <i className="fas fa-paperclip" /> {selectedFile.name}
              </div>
              <button onClick={onFileCancelSelection} style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', backgroundColor: '#ef4444', color: '#fff', fontSize: '12px', cursor: 'pointer', flexShrink: 0 }}>✕</button>
            </div>
            <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '8px' }}>
              {(selectedFile.size / 1024).toFixed(2)} KB · {selectedFile.type || 'Unknown type'}
            </div>
            {filePreviewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={filePreviewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '160px', borderRadius: '6px', marginBottom: '8px', objectFit: 'contain' }} />
            )}
            <Button variant="green" fullWidth onClick={onFileSend} disabled={uploadingFile || !effectivelyOnline}>
              {uploadingFile ? 'Sending...' : 'Send File'}
            </Button>
          </div>
        )}
      </div>

      {/* ── Voice Message ────────────────────────────── */}
      <div style={{ marginBottom: '20px' }}>
        <SectionTitle icon="fas fa-microphone" label="Voice Message" />
        <VoiceRecorder
          onRecordingComplete={onVoiceRecording}
          disabled={!effectivelyOnline || uploadingFile || !testRecipientId}
          onRecordingStart={onVoiceRecordingStart}
          onRecordingStop={onVoiceRecordingStop}
        />
        {!testRecipientId && (
          <div style={{ marginTop: '8px', padding: '8px', borderRadius: '6px', fontSize: '12px', textAlign: 'center',
            backgroundColor: isDark ? 'rgba(251,191,36,0.1)' : 'rgba(251,191,36,0.1)',
            color: isDark ? '#fbbf24' : '#d97706',
          }}>Select a recipient first</div>
        )}
      </div>

      {/* ── Typing Indicators ───────────────────────── */}
      <div style={{ marginBottom: '20px' }}>
        <SectionTitle icon="fas fa-keyboard" label="Typing Indicators" />
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="blue" onClick={onTypingStart} disabled={!effectivelyOnline} style={{ flex: 1 }}>Start</Button>
          <Button variant="purple" onClick={onTypingStop} disabled={!effectivelyOnline} style={{ flex: 1 }}>Stop</Button>
        </div>
      </div>

      {/* ── Presence ────────────────────────────────── */}
      <div style={{ marginBottom: '20px' }}>
        <SectionTitle icon="fas fa-user-circle" label="Presence" />
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <Button variant="green" onClick={() => onPresenceUpdate('online')} disabled={!effectivelyOnline} style={{ flex: 1 }}>Online</Button>
          <Button variant="orange" onClick={() => onPresenceUpdate('away')} disabled={!effectivelyOnline} style={{ flex: 1 }}>Away</Button>
        </div>
        <Button variant="purple" fullWidth onClick={onPresenceRequest} disabled={!effectivelyOnline}>Request Status</Button>
      </div>
    </div>
  );
}

