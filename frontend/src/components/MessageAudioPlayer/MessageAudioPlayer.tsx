'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import styles from './MessageAudioPlayer.module.css';

export interface MessageAudioPlayerProps {
  audioUrl: string;
  duration: number;
  waveformData: number[];
  timestamp: Date;
  isSent: boolean;
  messageId?: string;
  senderId?: string;
  onPlayStatusChange?: (messageId: string, senderId: string, isPlaying: boolean, isEnded?: boolean) => void;
  status?: 'queued' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isListening?: boolean;
  isActivePlayer?: boolean;
}

export default function MessageAudioPlayer({
  audioUrl,
  duration: propDuration,
  waveformData: propWaveformData,
  timestamp,
  isSent,
  messageId,
  senderId,
  onPlayStatusChange,
  status,
  isListening = false,
  isActivePlayer,
}: MessageAudioPlayerProps) {

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [actualDuration, setActualDuration] = useState(
    propDuration && !isNaN(propDuration) && isFinite(propDuration) && propDuration > 0 ? propDuration : 0
  );

  const audioRef = useRef<HTMLAudioElement>(null);

  // Always prefer propDuration (calculated from waveform samples — reliable across all browsers).
  // Only fall back to audio.duration if propDuration is missing/invalid.
  const propDurationValid = propDuration && !isNaN(propDuration) && isFinite(propDuration) && propDuration > 0;

  // Keep a ref so the useEffect closure always sees the current value (avoids stale closure)
  const propDurationValidRef = useRef(propDurationValid);
  useEffect(() => { propDurationValidRef.current = propDurationValid; }, [propDurationValid]);
  const propDurationRef = useRef(propDuration);
  useEffect(() => { propDurationRef.current = propDuration; }, [propDuration]);

  // Sync when propDuration arrives or changes (e.g. late socket patch)
  useEffect(() => {
    if (propDurationValid) {
      setActualDuration(propDuration);
    }
  }, [propDuration, propDurationValid]);

  const waveformData = useMemo(() => {
    if (propWaveformData && propWaveformData.length > 0) return propWaveformData;
    // Fallback placeholder
    return Array(60).fill(0).map((_, i) => 0.2 + 0.6 * Math.abs(Math.sin(i / 60 * Math.PI * 8 + i * 0.3)));
  }, [propWaveformData]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Fallback: enable player after 2s regardless of buffer state
    const loadTimeout = setTimeout(() => {
      if (!audioLoaded) setAudioLoaded(true);
    }, 2000);

    // Only use audio.duration if we don't already have a valid propDuration.
    // Chrome/Brave report Infinity for webm until fully buffered — never use that.
    // Use refs so this closure always reads the current value, not the stale mount-time value.
    const syncDurationFromElement = () => {
      if (propDurationValidRef.current) {
        // propDuration is already valid — make sure actualDuration reflects it
        setActualDuration(propDurationRef.current);
        return;
      }
      const d = audio.duration;
      if (d && !isNaN(d) && isFinite(d) && d > 0) {
        setActualDuration(d);
      }
    };

    const handleLoadedMetadata = () => syncDurationFromElement();
    const handleDurationChange  = () => syncDurationFromElement();

    const handleCanPlay = () => {
      clearTimeout(loadTimeout);
      setAudioLoaded(true);
      syncDurationFromElement();
    };

    const handleTimeUpdate = () => {
      if (!isPlaying) setCurrentTime(audio.currentTime);
      syncDurationFromElement();
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
      if (onPlayStatusChange && messageId && senderId) {
        if (!isSent) console.log('🎧 Fully listened, notifying sender', senderId);
        onPlayStatusChange(messageId, senderId, false, true);
      }
    };

    const handleError = (e: Event) => {
      const el = e.target as HTMLAudioElement;
      console.error('🎵 Audio error:', { code: el.error?.code, message: el.error?.message, audioUrl });
      setAudioLoaded(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange',  handleDurationChange);
    audio.addEventListener('canplay',         handleCanPlay);
    audio.addEventListener('timeupdate',      handleTimeUpdate);
    audio.addEventListener('ended',           handleEnded);
    audio.addEventListener('error',           handleError);

    audio.load();

    return () => {
      clearTimeout(loadTimeout);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange',  handleDurationChange);
      audio.removeEventListener('canplay',         handleCanPlay);
      audio.removeEventListener('timeupdate',      handleTimeUpdate);
      audio.removeEventListener('ended',           handleEnded);
      audio.removeEventListener('error',           handleError);
    };
  }, [audioUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Smooth RAF progress while playing
  useEffect(() => {
    if (!isPlaying || !audioRef.current) return;
    let rafId: number;
    const update = () => {
      if (audioRef.current && isPlaying) {
        setCurrentTime(audioRef.current.currentTime);
        rafId = requestAnimationFrame(update);
      }
    };
    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  // Single-player enforcement + auto-play
  const pendingAutoPlay = useRef(false);

  useEffect(() => {
    if (isActivePlayer === undefined) return;
    const audio = audioRef.current;
    if (isActivePlayer) {
      if (audio && audioLoaded && !isPlaying) {
        audio.play().catch(err => console.error('🎵 Auto-play error:', err));
        setIsPlaying(true);
        if (onPlayStatusChange && messageId && senderId) onPlayStatusChange(messageId, senderId, true, false);
      } else if (!audioLoaded) {
        pendingAutoPlay.current = true;
      }
    } else {
      pendingAutoPlay.current = false;
      if (audio && isPlaying) {
        audio.pause();
        setIsPlaying(false);
        if (onPlayStatusChange && messageId && senderId) onPlayStatusChange(messageId, senderId, false, false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActivePlayer]);

  useEffect(() => {
    if (!audioLoaded || !pendingAutoPlay.current) return;
    pendingAutoPlay.current = false;
    const audio = audioRef.current;
    if (!audio || isPlaying) return;
    audio.play().catch(err => console.error('🎵 Pending auto-play error:', err));
    setIsPlaying(true);
    if (onPlayStatusChange && messageId && senderId) onPlayStatusChange(messageId, senderId, true, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioLoaded]);

  const togglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current || !audioLoaded) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (onPlayStatusChange && messageId && senderId) onPlayStatusChange(messageId, senderId, false, false);
    } else {
      audioRef.current.play().catch(err => console.error('🎵 Play error:', err));
      setIsPlaying(true);
      if (onPlayStatusChange && messageId && senderId) onPlayStatusChange(messageId, senderId, true, false);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = actualDuration > 0 ? (currentTime / actualDuration) * 100 : 0;

  // Safe cross-origin check (no window access at module level)
  const isCrossOrigin = typeof window !== 'undefined'
    && audioUrl.startsWith('http')
    && !audioUrl.includes(window.location.hostname);

  return (
    <div className={styles.container}>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="auto"
        playsInline
        {...(isCrossOrigin ? { crossOrigin: 'anonymous' } : {})}
      />

      {/* Play button and waveform */}
      <div className={styles.controls}>
        <button
          onClick={togglePlayPause}
          disabled={!audioLoaded}
          className={styles.playBtn}
        >
          {!audioLoaded
            ? <i className="fas fa-spinner fa-pulse" />
            : isPlaying
            ? <i className="fas fa-pause" />
            : <i className="fas fa-play" />}
        </button>

        {/* Waveform — clickable for seeking */}
        <div
          onClick={(e) => {
            if (!audioRef.current || !audioLoaded || actualDuration <= 0) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const newTime = pct * actualDuration;
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
          }}
          className={`${styles.waveform} ${audioLoaded ? styles.waveformSeekable : styles.waveformStatic}`}
        >
          {waveformData.map((amplitude, index) => {
            const isPassed = (index / waveformData.length) * 100 <= progress;
            return (
              <div
                key={index}
                className={styles.waveBar}
                style={{
                  height: `${Math.max(amplitude * 100, 5)}%`,
                  backgroundColor: isPassed
                    ? (isSent ? '#f97316' : '#3b82f6')
                    : 'rgba(255, 255, 255, 0.4)',
                  marginRight: index < waveformData.length - 1 ? '1px' : '0',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Bottom row: elapsed / total  |  message timestamp */}
      <div className={`${styles.bottomRow} ${isSent ? styles.bottomRowSent : styles.bottomRowReceived}`}>
        <span>{formatTime(currentTime)} / {formatTime(actualDuration)}</span>
        <span>{timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
}
