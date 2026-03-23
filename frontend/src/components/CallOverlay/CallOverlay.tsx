'use client';

import { useCall } from '@/contexts/CallContext';
import { resolveAssetUrl } from '@/lib/imageUrl';
import styles from './CallOverlay.module.css';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getStatusLabel(status: string, endReason: string | null): string {
  switch (status) {
    case 'ringing-outbound': return 'Ringing…';
    case 'ringing-inbound':  return 'Incoming voice call';
    case 'connecting':       return 'Connecting…';
    case 'active':           return 'On call';
    case 'ended': {
      if (endReason === 'rejected')         return 'Call declined';
      if (endReason === 'no_answer')        return 'No answer';
      if (endReason === 'missed')           return 'Missed call';
      if (endReason === 'disconnect')       return 'Call disconnected';
      if (endReason === 'connection_failed') return 'Connection failed';
      if (endReason === 'mic_https')        return 'Mic requires HTTPS';
      if (endReason === 'mic_error')        return 'Microphone unavailable';
      return 'Call ended';
    }
    default: return '';
  }
}

function getStatusClass(status: string): string {
  if (status === 'ringing-outbound' || status === 'ringing-inbound' || status === 'connecting') return styles.ringing;
  if (status === 'active') return styles.active;
  if (status === 'ended') return styles.ended;
  return '';
}

function AvatarDisplay({ peer }: { peer: { displayName?: string | null; profileImage?: string | null; username?: string } }) {
  const name = peer.displayName || peer.username || '?';
  const initial = name.charAt(0).toUpperCase();
  const src = resolveAssetUrl(peer.profileImage);

  if (src) {
    return <img src={src} alt={name} className={styles.avatar} />;
  }

  return <div className={styles.avatarPlaceholder}>{initial}</div>;
}

export default function CallOverlay() {
  const { status, peer, isMuted, duration, endReason, acceptCall, rejectCall, hangup, toggleMute } = useCall();

  if (status === 'idle' || !peer) return null;

  const isRinging = status === 'ringing-outbound' || status === 'ringing-inbound' || status === 'connecting';
  const statusLabel = getStatusLabel(status, endReason);
  const statusClass = getStatusClass(status);

  return (
    <div className={styles.backdrop}>
      <div className={isRinging ? styles.ringing : undefined}>
        <AvatarDisplay peer={peer} />
      </div>

      <div className={styles.peerName}>
        {peer.displayName || peer.username || 'Unknown'}
      </div>

      <div className={`${styles.statusText} ${statusClass}`}>
        {statusLabel}
      </div>

      {status === 'active' && (
        <div className={styles.duration}>{formatDuration(duration)}</div>
      )}

      <div className={styles.controls}>
        {/* Incoming call: Accept + Reject */}
        {status === 'ringing-inbound' && (
          <>
            <div className={styles.controlGroup}>
              <button className={`${styles.controlBtn} ${styles.rejectBtn}`} onClick={rejectCall} aria-label="Decline call">
                <i className="fas fa-phone-slash" />
              </button>
              <span className={styles.controlLabel}>Decline</span>
            </div>
            <div className={styles.controlGroup}>
              <button className={`${styles.controlBtn} ${styles.acceptBtn}`} onClick={acceptCall} aria-label="Accept call">
                <i className="fas fa-phone" />
              </button>
              <span className={styles.controlLabel}>Accept</span>
            </div>
          </>
        )}

        {/* Outbound ringing / connecting: just a hangup */}
        {(status === 'ringing-outbound' || status === 'connecting') && (
          <div className={styles.controlGroup}>
            <button className={`${styles.controlBtn} ${styles.hangupBtn}`} onClick={hangup} aria-label="Cancel call">
              <i className="fas fa-phone-slash" />
            </button>
            <span className={styles.controlLabel}>Cancel</span>
          </div>
        )}

        {/* Active call: mute + hangup */}
        {status === 'active' && (
          <>
            <div className={styles.controlGroup}>
              <button
                className={`${styles.controlBtn} ${styles.muteBtn} ${isMuted ? styles.muted : ''}`}
                onClick={toggleMute}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                <i className={isMuted ? 'fas fa-microphone-slash' : 'fas fa-microphone'} />
              </button>
              <span className={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</span>
            </div>
            <div className={styles.controlGroup}>
              <button className={`${styles.controlBtn} ${styles.hangupBtn}`} onClick={hangup} aria-label="End call">
                <i className="fas fa-phone-slash" />
              </button>
              <span className={styles.controlLabel}>End</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
